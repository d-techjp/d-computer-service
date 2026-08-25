import type { RepositoryPage } from '../../../common/interfaces/repository-page.interface';
import type { QueryCategoryDto } from '../dto/query-category.dto';
import type { Category } from '../entities/category.entity';

/** Port cho persistence của Category — xem `BrandsRepository` cho giải thích convention. */
export abstract class CategoriesRepository {
    abstract create(data: Partial<Category>): Category;

    abstract save(category: Category): Promise<Category>;

    abstract search(criteria: QueryCategoryDto): Promise<RepositoryPage<Category>>;

    /** Toàn bộ category (kèm lọc `isActive`) để dựng cây trong bộ nhớ ở service. */
    abstract findAllForTree(onlyActive: boolean): Promise<Category[]>;

    abstract findById(id: string): Promise<Category | null>;

    abstract findBySlug(slug: string): Promise<Category | null>;

    abstract softRemove(category: Category): Promise<void>;

    abstract countBySlug(slug: string, excludeId?: string): Promise<number>;

    abstract countByParentId(parentId: string): Promise<number>;

    /** Số sản phẩm (chưa xoá) gán trực tiếp vào category này — dùng chặn xoá khi đang được dùng. */
    abstract countProductsByCategoryId(categoryId: string): Promise<number>;

    abstract countActiveRoots(): Promise<number>;

    /** Id các category có parent nằm trong `parentIds` — dùng dựng cây con đệ quy. */
    abstract findIdsByParentIds(parentIds: string[]): Promise<string[]>;

    /** Ghi đè `sortOrder` hàng loạt trong 1 transaction — dùng cho kéo-thả sắp xếp. */
    abstract bulkUpdateSortOrder(items: { id: string; sortOrder: number }[]): Promise<void>;
}
