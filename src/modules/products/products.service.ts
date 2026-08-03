import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { PaginatedResult } from '../../common/dto/paginated-result.dto';
import { resolveSortColumn } from '../../common/utils/query.util';
import { slugify } from '../../common/utils/slug.util';
import { BrandsService } from '../brands/brands.service';
import { CategoriesService } from '../categories/categories.service';
import type { CreateProductDto } from './dto/create-product.dto';
import type { QueryProductDto } from './dto/query-product.dto';
import type { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductStatus } from './entities/product.entity';

const SORTABLE_COLUMNS = [
    'createdAt',
    'updatedAt',
    'name',
    'price',
    'stock',
    'soldCount',
    'viewCount',
] as const;

@Injectable()
export class ProductsService {
    constructor(
        @InjectRepository(Product) private readonly productsRepository: Repository<Product>,
        private readonly categoriesService: CategoriesService,
        private readonly brandsService: BrandsService,
    ) {}

    async create(dto: CreateProductDto): Promise<Product> {
        await this.assertSkuAvailable(dto.sku);
        await this.assertRelationsExist(dto.categoryId, dto.brandId);
        this.assertPriceConsistent(dto.price, dto.compareAtPrice);

        const product = this.productsRepository.create({
            ...dto,
            slug: await this.resolveSlug(dto.slug ?? dto.name),
        });
        return this.productsRepository.save(product);
    }

    async findAll(query: QueryProductDto): Promise<PaginatedResult<Product>> {
        const qb = this.productsRepository
            .createQueryBuilder('product')
            .leftJoin('product.category', 'category')
            .addSelect(['category.id', 'category.name', 'category.slug'])
            .leftJoin('product.brand', 'brand')
            .addSelect(['brand.id', 'brand.name', 'brand.slug']);

        if (query.search) {
            qb.andWhere(
                '(product.name ILIKE :search OR product.sku ILIKE :search OR product.shortDescription ILIKE :search)',
                { search: `%${query.search}%` },
            );
        }

        if (query.categoryId) {
            if (query.includeSubCategories) {
                const ids = await this.categoriesService.collectSubtreeIds(query.categoryId);
                qb.andWhere('product.categoryId IN (:...categoryIds)', { categoryIds: ids });
            } else {
                qb.andWhere('product.categoryId = :categoryId', { categoryId: query.categoryId });
            }
        }

        if (query.brandId) qb.andWhere('product.brandId = :brandId', { brandId: query.brandId });
        if (query.status) qb.andWhere('product.status = :status', { status: query.status });
        if (query.minPrice !== undefined) {
            qb.andWhere('product.price >= :minPrice', { minPrice: query.minPrice });
        }
        if (query.maxPrice !== undefined) {
            qb.andWhere('product.price <= :maxPrice', { maxPrice: query.maxPrice });
        }
        if (query.inStock !== undefined) {
            qb.andWhere(query.inStock ? 'product.stock > 0' : 'product.stock <= 0');
        }
        if (query.isFeatured !== undefined) {
            qb.andWhere('product.isFeatured = :isFeatured', { isFeatured: query.isFeatured });
        }

        const sortBy = resolveSortColumn(query.sortBy, SORTABLE_COLUMNS, 'createdAt');
        qb.orderBy(`product.${sortBy}`, query.sortOrder).skip(query.skip).take(query.limit);

        const [items, total] = await qb.getManyAndCount();
        return new PaginatedResult(items, total, query.page, query.limit);
    }

    async findOne(id: string): Promise<Product> {
        const product = await this.productsRepository.findOne({
            where: { id },
            relations: { category: true, brand: true },
        });
        if (!product) throw new NotFoundException(`Không tìm thấy sản phẩm với id ${id}`);
        return product;
    }

    async findBySlug(slug: string): Promise<Product> {
        const product = await this.productsRepository.findOne({
            where: { slug },
            relations: { category: true, brand: true },
        });
        if (!product) throw new NotFoundException(`Không tìm thấy sản phẩm với slug ${slug}`);

        // Đếm lượt xem không chặn response và không đụng tới updatedAt
        await this.productsRepository.increment({ id: product.id }, 'viewCount', 1);
        return product;
    }

    findByIds(ids: string[]): Promise<Product[]> {
        if (ids.length === 0) return Promise.resolve([]);
        return this.productsRepository.find({ where: { id: In(ids) } });
    }

    async update(id: string, dto: UpdateProductDto): Promise<Product> {
        const product = await this.findOne(id);

        if (dto.sku && dto.sku !== product.sku) await this.assertSkuAvailable(dto.sku, id);
        await this.assertRelationsExist(dto.categoryId, dto.brandId);
        this.assertPriceConsistent(
            dto.price ?? product.price,
            dto.compareAtPrice ?? product.compareAtPrice,
        );

        if (dto.slug && dto.slug !== product.slug) {
            product.slug = await this.resolveSlug(dto.slug, id);
        } else if (dto.name && dto.name !== product.name && !dto.slug) {
            product.slug = await this.resolveSlug(dto.name, id);
        }

        const { slug: _slug, ...rest } = dto;
        Object.assign(product, rest);
        return this.productsRepository.save(product);
    }

    async remove(id: string): Promise<void> {
        await this.productsRepository.softRemove(await this.findOne(id));
    }

    /** Điều chỉnh tồn kho thủ công (nhập hàng, kiểm kê). `delta` âm để trừ. */
    async adjustStock(id: string, delta: number, reason?: string): Promise<Product> {
        const product = await this.findOne(id);
        const nextStock = product.stock + delta;

        if (nextStock < 0) {
            throw new BadRequestException(
                `Tồn kho không đủ: hiện có ${product.stock}, yêu cầu giảm ${Math.abs(delta)}`,
            );
        }

        product.stock = nextStock;
        if (nextStock === 0 && product.status === ProductStatus.ACTIVE) {
            product.status = ProductStatus.OUT_OF_STOCK;
        } else if (nextStock > 0 && product.status === ProductStatus.OUT_OF_STOCK) {
            product.status = ProductStatus.ACTIVE;
        }

        void reason; // reason được ghi ở activity log qua interceptor
        return this.productsRepository.save(product);
    }

    /** Sản phẩm có tồn kho <= ngưỡng cảnh báo. */
    findLowStock(limit = 50): Promise<Product[]> {
        return this.productsRepository
            .createQueryBuilder('product')
            .where('product.stock <= product.lowStockThreshold')
            .andWhere('product.status != :archived', { archived: ProductStatus.ARCHIVED })
            .orderBy('product.stock', 'ASC')
            .take(limit)
            .getMany();
    }

    private assertPriceConsistent(price: number, compareAtPrice: number | null | undefined): void {
        if (compareAtPrice !== null && compareAtPrice !== undefined && compareAtPrice < price) {
            throw new BadRequestException('compareAtPrice phải lớn hơn hoặc bằng price');
        }
    }

    private async assertSkuAvailable(sku: string, excludeId?: string): Promise<void> {
        const count = await this.productsRepository.count({
            where: excludeId ? { sku, id: Not(excludeId) } : { sku },
        });
        if (count > 0) throw new ConflictException(`SKU ${sku} đã tồn tại`);
    }

    private async assertRelationsExist(
        categoryId?: string | null,
        brandId?: string | null,
    ): Promise<void> {
        if (categoryId) await this.categoriesService.findOne(categoryId);
        if (brandId) await this.brandsService.findOne(brandId);
    }

    private async resolveSlug(source: string, excludeId?: string): Promise<string> {
        const base = slugify(source);
        if (!base) throw new BadRequestException('Không tạo được slug hợp lệ từ tên sản phẩm');

        let candidate = base;
        let suffix = 1;
        while (
            (await this.productsRepository.count({
                where: excludeId ? { slug: candidate, id: Not(excludeId) } : { slug: candidate },
            })) > 0
        ) {
            suffix += 1;
            candidate = `${base}-${suffix}`;
        }
        return candidate;
    }
}
