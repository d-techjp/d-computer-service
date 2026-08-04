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

    abstract findLowStock(limit: number): Promise<Product[]>;

    abstract countBySku(sku: string, excludeId?: string): Promise<number>;

    abstract countBySlug(slug: string, excludeId?: string): Promise<number>;
}
