import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import type { RepositoryPage } from '../../../common/interfaces/repository-page.interface';
import { resolveSortColumn } from '../../../common/utils/query.util';
import { ProductsRepository } from '../domain/products.repository';
import type { QueryProductDto } from '../dto/query-product.dto';
import { Product } from '../entities/product.entity';
import { refreshProductAggregates } from './product-aggregates';

const SORTABLE_COLUMNS = [
    'createdAt',
    'updatedAt',
    'name',
    'minPrice',
    'totalStock',
    'soldCount',
    'viewCount',
] as const;

/** Chi tiết sản phẩm nạp kèm toàn bộ biến thể + tổ hợp option của từng biến thể. */
const DETAIL_RELATIONS = {
    category: true,
    brand: true,
    variants: { optionValues: { option: true } },
    options: { values: true },
} as const;

@Injectable()
export class TypeOrmProductsRepository extends ProductsRepository {
    constructor(@InjectRepository(Product) private readonly repo: Repository<Product>) {
        super();
    }

    create(data: Partial<Product>): Product {
        return this.repo.create(data);
    }

    save(product: Product): Promise<Product> {
        return this.repo.save(product);
    }

    async search(
        criteria: QueryProductDto,
        categoryIds?: string[],
    ): Promise<RepositoryPage<Product>> {
        const qb = this.repo
            .createQueryBuilder('product')
            .leftJoin('product.category', 'category')
            .addSelect(['category.id', 'category.name', 'category.slug'])
            .leftJoin('product.brand', 'brand')
            .addSelect(['brand.id', 'brand.name', 'brand.slug'])
            // Danh sách chỉ cần biến thể mặc định: FE hiển thị giá và có sẵn
            // variantId để "mua ngay" mà không phải gọi thêm API chi tiết.
            // -> `product.variants` ở response danh sách CHỈ chứa 1 phần tử.
            .leftJoinAndSelect(
                'product.variants',
                'variant',
                'variant.is_default = true AND variant.deleted_at IS NULL',
            );

        if (criteria.search) {
            qb.andWhere(
                '(product.name ILIKE :search OR product.shortDescription ILIKE :search' +
                    ' OR EXISTS (SELECT 1 FROM product_variants sv' +
                    ' WHERE sv.product_id = product.id AND sv.deleted_at IS NULL' +
                    ' AND sv.sku ILIKE :search))',
                { search: `%${criteria.search}%` },
            );
        }

        if (categoryIds) {
            qb.andWhere('product.categoryId IN (:...categoryIds)', { categoryIds });
        } else if (criteria.categoryId) {
            qb.andWhere('product.categoryId = :categoryId', { categoryId: criteria.categoryId });
        }

        if (criteria.brandId)
            qb.andWhere('product.brandId = :brandId', { brandId: criteria.brandId });
        if (criteria.status) qb.andWhere('product.status = :status', { status: criteria.status });
        if (criteria.productType) {
            qb.andWhere('product.productType = :productType', {
                productType: criteria.productType,
            });
        }
        // Lọc theo khoảng giá dùng cột read-model: sản phẩm lọt lưới khi khoảng
        // giá [minPrice, maxPrice] của nó giao với khoảng người dùng yêu cầu.
        if (criteria.minPrice !== undefined) {
            qb.andWhere('product.maxPrice >= :minPrice', { minPrice: criteria.minPrice });
        }
        if (criteria.maxPrice !== undefined) {
            qb.andWhere('product.minPrice <= :maxPrice', { maxPrice: criteria.maxPrice });
        }
        if (criteria.inStock !== undefined) {
            qb.andWhere(criteria.inStock ? 'product.totalStock > 0' : 'product.totalStock <= 0');
        }
        if (criteria.isFeatured !== undefined) {
            qb.andWhere('product.isFeatured = :isFeatured', { isFeatured: criteria.isFeatured });
        }

        const sortBy = resolveSortColumn(criteria.sortBy, SORTABLE_COLUMNS, 'createdAt');
        // skip/take (không phải offset/limit) để phân trang theo sản phẩm,
        // không bị lệch vì join bảng variants quan hệ 1-n
        qb.orderBy(`product.${sortBy}`, criteria.sortOrder)
            .skip(criteria.skip)
            .take(criteria.limit);

        const [items, total] = await qb.getManyAndCount();
        return { items, total };
    }

    findById(id: string): Promise<Product | null> {
        return this.repo.findOne({ where: { id }, relations: DETAIL_RELATIONS });
    }

    findBySlug(slug: string): Promise<Product | null> {
        return this.repo.findOne({ where: { slug }, relations: DETAIL_RELATIONS });
    }

    findByIds(ids: string[]): Promise<Product[]> {
        if (ids.length === 0) return Promise.resolve([]);
        return this.repo.find({ where: { id: In(ids) } });
    }

    async softRemove(product: Product): Promise<void> {
        await this.repo.softRemove(product);
    }

    async incrementViewCount(id: string): Promise<void> {
        await this.repo.increment({ id }, 'viewCount', 1);
    }

    countBySlug(slug: string, excludeId?: string): Promise<number> {
        return this.repo.count({ where: excludeId ? { slug, id: Not(excludeId) } : { slug } });
    }

    refreshAggregates(productId: string): Promise<void> {
        return refreshProductAggregates(this.repo, productId);
    }
}
