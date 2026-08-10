import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import type { RepositoryPage } from '../../../common/interfaces/repository-page.interface';
import { resolveSortColumn } from '../../../common/utils/query.util';
import { Product } from '../../products/entities/product.entity';
import { CategoriesRepository } from '../domain/categories.repository';
import type { QueryCategoryDto } from '../dto/query-category.dto';
import { Category } from '../entities/category.entity';

const SORTABLE_COLUMNS = ['createdAt', 'updatedAt', 'name', 'sortOrder'] as const;

@Injectable()
export class TypeOrmCategoriesRepository extends CategoriesRepository {
    constructor(@InjectRepository(Category) private readonly repo: Repository<Category>) {
        super();
    }

    create(data: Partial<Category>): Category {
        return this.repo.create(data);
    }

    save(category: Category): Promise<Category> {
        return this.repo.save(category);
    }

    async search(criteria: QueryCategoryDto): Promise<RepositoryPage<Category>> {
        const qb = this.repo
            .createQueryBuilder('category')
            .leftJoin('category.parent', 'parent')
            .addSelect(['parent.id', 'parent.name', 'parent.slug']);

        if (criteria.search) {
            qb.andWhere('(category.name ILIKE :search OR category.slug ILIKE :search)', {
                search: `%${criteria.search}%`,
            });
        }
        if (criteria.rootOnly) qb.andWhere('category.parentId IS NULL');
        else if (criteria.parentId) {
            qb.andWhere('category.parentId = :parentId', { parentId: criteria.parentId });
        }

        if (criteria.isActive !== undefined) {
            qb.andWhere('category.isActive = :isActive', { isActive: criteria.isActive });
        }

        const sortBy = resolveSortColumn(criteria.sortBy, SORTABLE_COLUMNS, 'sortOrder');
        qb.orderBy(`category.${sortBy}`, criteria.sortOrder)
            .skip(criteria.skip)
            .take(criteria.limit);

        const [items, total] = await qb.getManyAndCount();
        await this.attachProductCounts(items);
        return { items, total };
    }

    /**
     * Gắn `productCount` cho một trang category bằng đúng MỘT truy vấn GROUP BY,
     * thay vì đếm riêng cho từng category (n+1). Category không có sản phẩm nào
     * thì không xuất hiện trong kết quả GROUP BY — set mặc định 0 trước cho toàn
     * bộ rồi mới ghi đè bằng số đếm thật.
     */
    private async attachProductCounts(categories: Category[]): Promise<void> {
        if (categories.length === 0) return;
        for (const category of categories) category.productCount = 0;

        const categoryIds = categories.map((category) => category.id);
        const rows = await this.repo.manager
            .createQueryBuilder(Product, 'product')
            .select('product.categoryId', 'categoryId')
            .addSelect('COUNT(*)', 'count')
            .where('product.categoryId IN (:...categoryIds)', { categoryIds })
            .groupBy('product.categoryId')
            .getRawMany<{ categoryId: string; count: string }>();

        const countByCategoryId = new Map(rows.map((row) => [row.categoryId, Number(row.count)]));
        for (const category of categories) {
            category.productCount = countByCategoryId.get(category.id) ?? 0;
        }
    }

    findAllForTree(onlyActive: boolean): Promise<Category[]> {
        return this.repo.find({
            where: onlyActive ? { isActive: true } : {},
            order: { sortOrder: 'ASC', name: 'ASC' },
        });
    }

    findById(id: string): Promise<Category | null> {
        return this.repo.findOne({ where: { id }, relations: { parent: true, children: true } });
    }

    findBySlug(slug: string): Promise<Category | null> {
        return this.repo.findOne({ where: { slug }, relations: { parent: true, children: true } });
    }

    async softRemove(category: Category): Promise<void> {
        await this.repo.softRemove(category);
    }

    countBySlug(slug: string, excludeId?: string): Promise<number> {
        return this.repo.count({
            where: excludeId ? { slug, id: Not(excludeId) } : { slug },
            withDeleted: false,
        });
    }

    countByParentId(parentId: string): Promise<number> {
        return this.repo.count({ where: { parentId } });
    }

    countActiveRoots(): Promise<number> {
        return this.repo.count({ where: { isActive: true, parentId: IsNull() } });
    }

    async findIdsByParentIds(parentIds: string[]): Promise<string[]> {
        if (parentIds.length === 0) return [];
        const children = await this.repo.find({
            where: parentIds.map((parentId) => ({ parentId })),
            select: { id: true },
        });
        return children.map((child) => child.id);
    }
}
