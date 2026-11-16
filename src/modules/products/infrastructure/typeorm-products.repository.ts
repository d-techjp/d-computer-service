import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository, SelectQueryBuilder } from 'typeorm';
import type { RepositoryPage } from '../../../common/interfaces/repository-page.interface';
import { resolveSortColumn } from '../../../common/utils/query.util';
import { PRODUCT_SORTABLE_COLUMNS } from '../domain/product-sortable-columns';
import type { ProductSearchOptions } from '../domain/products.repository';
import { ProductsRepository } from '../domain/products.repository';
import type { QueryProductDto } from '../dto/query-product.dto';
import { Product, ProductStatus } from '../entities/product.entity';
import { refreshProductAggregates } from './product-aggregates';
import { applySearchFilter, parseSearchTokens, relevanceScoreSql } from './product-search.query';

/** Chi tiết sản phẩm nạp kèm toàn bộ biến thể + tổ hợp option của từng biến thể. */
const DETAIL_RELATIONS = {
    category: true,
    brand: true,
    variants: { optionValues: { option: true } },
    options: { values: true },
} as const;

const DETAIL_ORDER = {
    variants: {
        position: 'ASC',
        createdAt: 'ASC',
        optionValues: {
            position: 'ASC',
            createdAt: 'ASC',
            option: { position: 'ASC', createdAt: 'ASC' },
        },
    },
    options: {
        position: 'ASC',
        createdAt: 'ASC',
        values: { position: 'ASC', createdAt: 'ASC' },
    },
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
        options?: ProductSearchOptions,
    ): Promise<RepositoryPage<Product>> {
        const tokens = parseSearchTokens(criteria.search);
        // Có từ khoá mà người dùng không chọn cách sắp xếp (vẫn là mặc định
        // `createdAt`) -> xếp theo độ liên quan, kết quả khớp tên lên trước.
        if (tokens.length > 0 && criteria.sortBy === 'createdAt') {
            return this.searchByRelevance(criteria, tokens, options);
        }

        const qb = this.buildSearchQuery(criteria, options);

        const sortBy = resolveSortColumn(criteria.sortBy, PRODUCT_SORTABLE_COLUMNS, 'createdAt');
        // skip/take (không phải offset/limit) để phân trang theo sản phẩm,
        // không bị lệch vì join bảng variants quan hệ 1-n
        qb.orderBy(`product.${sortBy}`, criteria.sortOrder)
            .skip(criteria.skip)
            .take(criteria.limit);

        const [items, total] = await qb.getManyAndCount();
        return { items, total };
    }

    /**
     * Hai bước: (1) lấy id đã xếp theo điểm + phân trang bằng SQL thuần, (2) nạp
     * entity theo đúng các id đó. `orderBy` theo alias tính toán kết hợp với
     * `skip/take` của TypeORM không ổn định, nên không gộp làm một.
     * Mỗi sản phẩm chỉ join đúng 1 biến thể mặc định nên offset/limit không lệch.
     */
    private async searchByRelevance(
        criteria: QueryProductDto,
        tokens: string[],
        options?: ProductSearchOptions,
    ): Promise<RepositoryPage<Product>> {
        const ranked = await this.buildSearchQuery(criteria, options)
            .select('product.id', 'id')
            .addSelect(relevanceScoreSql(tokens), 'score')
            .orderBy('score', 'DESC')
            .addOrderBy('product.soldCount', 'DESC')
            .addOrderBy('product.createdAt', 'DESC')
            .offset(criteria.skip)
            .limit(criteria.limit)
            .getRawMany<{ id: string }>();
        const total = await this.buildSearchQuery(criteria, options).getCount();

        const ids = ranked.map((row) => row.id);
        if (ids.length === 0) return { items: [], total };

        const items = await this.buildSearchQuery(criteria, options)
            .andWhere('product.id IN (:...rankedIds)', { rankedIds: ids })
            .getMany();
        const position = new Map(ids.map((id, index) => [id, index]));
        items.sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0));
        return { items, total };
    }

    private buildSearchQuery(
        criteria: QueryProductDto,
        options?: ProductSearchOptions,
    ): SelectQueryBuilder<Product> {
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

        applySearchFilter(qb, parseSearchTokens(criteria.search));

        if (options?.categoryIds) {
            qb.andWhere('product.categoryId IN (:...categoryIds)', {
                categoryIds: options.categoryIds,
            });
        } else if (criteria.categoryId) {
            qb.andWhere('product.categoryId = :categoryId', { categoryId: criteria.categoryId });
        }

        // `categoryId IS NULL` phải lọt qua — NOT IN với cột có thể NULL sẽ loại
        // oan các dòng đó nếu thiếu nhánh OR này (NULL NOT IN (...) = UNKNOWN).
        if (options?.excludedCategoryIds?.length) {
            qb.andWhere(
                '(product.categoryId IS NULL OR product.categoryId NOT IN (:...excludedCategoryIds))',
                { excludedCategoryIds: options.excludedCategoryIds },
            );
        }

        // Rào trạng thái do phía gọi áp đặt — cộng dồn (AND) với `criteria.status`
        // của người dùng, nên client không thể nới rộng phạm vi bằng query param.
        if (options?.statuses?.length) {
            qb.andWhere('product.status IN (:...visibleStatuses)', {
                visibleStatuses: options.statuses,
            });
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

        return qb;
    }

    findById(id: string, statuses?: ProductStatus[]): Promise<Product | null> {
        return this.repo.findOne({
            where: statuses?.length ? { id, status: In(statuses) } : { id },
            relations: DETAIL_RELATIONS,
            order: DETAIL_ORDER,
        });
    }

    findBySlug(slug: string, statuses?: ProductStatus[]): Promise<Product | null> {
        return this.repo.findOne({
            where: statuses?.length ? { slug, status: In(statuses) } : { slug },
            relations: DETAIL_RELATIONS,
            order: DETAIL_ORDER,
        });
    }

    async existsWithStatus(
        id: string,
        statuses: ProductStatus[],
        excludedCategoryIds?: string[],
    ): Promise<boolean> {
        const qb = this.repo
            .createQueryBuilder('product')
            .where('product.id = :id', { id })
            .andWhere('product.status IN (:...statuses)', { statuses });

        if (excludedCategoryIds?.length) {
            qb.andWhere(
                '(product.categoryId IS NULL OR product.categoryId NOT IN (:...excludedCategoryIds))',
                { excludedCategoryIds },
            );
        }

        return (await qb.getCount()) > 0;
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

    async bulkUpdateStatus(ids: string[], status: ProductStatus): Promise<void> {
        if (ids.length === 0) return;
        await this.repo.update({ id: In(ids) }, { status });
    }

    refreshAggregates(productId: string): Promise<void> {
        return refreshProductAggregates(this.repo, productId);
    }
}
