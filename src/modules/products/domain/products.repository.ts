import type { RepositoryPage } from '../../../common/interfaces/repository-page.interface';
import type { QueryProductDto } from '../dto/query-product.dto';
import type { Product } from '../entities/product.entity';

export abstract class ProductsRepository {
    abstract create(data: Partial<Product>): Product;

    abstract save(product: Product): Promise<Product>;

    /**
     * `categoryIds`: khi lọc theo danh mục kèm danh mục con, service tự resolve
     * cây danh mục qua `CategoriesService` (business logic) rồi truyền danh sách
     * id phẳng xuống đây — repository không biết gì về cấu trúc cây.
     */
    abstract search(
        criteria: QueryProductDto,
        categoryIds?: string[],
    ): Promise<RepositoryPage<Product>>;

    abstract findById(id: string): Promise<Product | null>;

    abstract findBySlug(slug: string): Promise<Product | null>;

    abstract findByIds(ids: string[]): Promise<Product[]>;

    abstract softRemove(product: Product): Promise<void>;

    abstract incrementViewCount(id: string): Promise<void>;

    abstract countBySlug(slug: string, excludeId?: string): Promise<number>;

    /**
     * Ghi lại các cột read-model (`min_price`, `max_price`, `total_stock`,
     * `has_variants`) từ biến thể hiện có. Chạy bằng một câu UPDATE ... FROM
     * duy nhất để không đọc-rồi-ghi (tránh mất cập nhật khi hai request cùng
     * sửa biến thể của một sản phẩm).
     */
    abstract refreshAggregates(productId: string): Promise<void>;
}
