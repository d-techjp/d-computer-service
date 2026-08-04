import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import type { RepositoryPage } from '../../../common/interfaces/repository-page.interface';
import { resolveSortColumn } from '../../../common/utils/query.util';
import { ProductsRepository } from '../domain/products.repository';
import type { QueryProductDto } from '../dto/query-product.dto';
import { Product, ProductStatus } from '../entities/product.entity';

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
            .addSelect(['brand.id', 'brand.name', 'brand.slug']);

        if (criteria.search) {
            qb.andWhere(
                '(product.name ILIKE :search OR product.sku ILIKE :search OR product.shortDescription ILIKE :search)',
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
        if (criteria.minPrice !== undefined) {
            qb.andWhere('product.price >= :minPrice', { minPrice: criteria.minPrice });
        }
        if (criteria.maxPrice !== undefined) {
            qb.andWhere('product.price <= :maxPrice', { maxPrice: criteria.maxPrice });
        }
        if (criteria.inStock !== undefined) {
            qb.andWhere(criteria.inStock ? 'product.stock > 0' : 'product.stock <= 0');
        }
        if (criteria.isFeatured !== undefined) {
            qb.andWhere('product.isFeatured = :isFeatured', { isFeatured: criteria.isFeatured });
        }

        const sortBy = resolveSortColumn(criteria.sortBy, SORTABLE_COLUMNS, 'createdAt');
        qb.orderBy(`product.${sortBy}`, criteria.sortOrder)
            .skip(criteria.skip)
            .take(criteria.limit);

        const [items, total] = await qb.getManyAndCount();
        return { items, total };
    }

    findById(id: string): Promise<Product | null> {
        return this.repo.findOne({ where: { id }, relations: { category: true, brand: true } });
    }

    findBySlug(slug: string): Promise<Product | null> {
        return this.repo.findOne({ where: { slug }, relations: { category: true, brand: true } });
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

    findLowStock(limit: number): Promise<Product[]> {
        return this.repo
            .createQueryBuilder('product')
            .where('product.stock <= product.lowStockThreshold')
            .andWhere('product.status != :archived', { archived: ProductStatus.ARCHIVED })
            .orderBy('product.stock', 'ASC')
            .take(limit)
            .getMany();
    }

    countBySku(sku: string, excludeId?: string): Promise<number> {
        return this.repo.count({ where: excludeId ? { sku, id: Not(excludeId) } : { sku } });
    }

    countBySlug(slug: string, excludeId?: string): Promise<number> {
        return this.repo.count({ where: excludeId ? { slug, id: Not(excludeId) } : { slug } });
    }
}
