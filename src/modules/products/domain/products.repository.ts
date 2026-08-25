import type { RepositoryPage } from '../../../common/interfaces/repository-page.interface';
import type { QueryProductDto } from '../dto/query-product.dto';
import type { Product, ProductStatus } from '../entities/product.entity';

export interface ProductSearchOptions {
    /**
     * Khi lọc theo danh mục kèm danh mục con, service tự resolve cây danh mục qua
     * `CategoriesService` (business logic) rồi truyền danh sách id phẳng xuống đây
     * — repository không biết gì về cấu trúc cây.
     */
    categoryIds?: string[];

    /**
     * Giới hạn trạng thái được trả về, ĐỘC LẬP với `criteria.status` do người dùng
     * gửi lên. Bỏ trống = không giới hạn (quản trị). Storefront luôn truyền tập
     * trạng thái công khai để hàng nháp / đã archive không lọt ra ngoài dù client
     * có cố gửi filter gì đi nữa.
     */
    statuses?: ProductStatus[];

    /**
     * Id danh mục đã tắt hiển thị (hoặc có tổ tiên bị tắt) — sản phẩm thuộc các
     * danh mục này bị loại khỏi kết quả. Cũng do storefront áp đặt, độc lập với
     * `criteria.categoryId`; sản phẩm không gắn danh mục nào (`categoryId IS NULL`)
     * không bị ảnh hưởng bởi bộ lọc này.
     */
    excludedCategoryIds?: string[];
}

export abstract class ProductsRepository {
    abstract create(data: Partial<Product>): Product;

    abstract save(product: Product): Promise<Product>;

    abstract search(
        criteria: QueryProductDto,
        options?: ProductSearchOptions,
    ): Promise<RepositoryPage<Product>>;

    /** `statuses`: bỏ trống = tìm mọi trạng thái; truyền vào = ngoài tập đó coi như không tồn tại. */
    abstract findById(id: string, statuses?: ProductStatus[]): Promise<Product | null>;

    abstract findBySlug(slug: string, statuses?: ProductStatus[]): Promise<Product | null>;

    /**
     * Sản phẩm có tồn tại và nằm trong tập trạng thái cho phép không. Dùng để gác
     * các endpoint dữ liệu con (biến thể, option, mô tả) — nhẹ hơn `findById` vì
     * không nạp kèm quan hệ nào.
     */
    abstract existsWithStatus(
        id: string,
        statuses: ProductStatus[],
        excludedCategoryIds?: string[],
    ): Promise<boolean>;

    abstract findByIds(ids: string[]): Promise<Product[]>;

    abstract softRemove(product: Product): Promise<void>;

    abstract incrementViewCount(id: string): Promise<void>;

    abstract countBySlug(slug: string, excludeId?: string): Promise<number>;

    /** Cập nhật `status` hàng loạt — dùng khi tự tắt bán các combo mất thành phần sau khi xoá sản phẩm. */
    abstract bulkUpdateStatus(ids: string[], status: ProductStatus): Promise<void>;

    /**
     * Ghi lại các cột read-model (`min_price`, `max_price`, `total_stock`,
     * `has_variants`) từ biến thể hiện có. Chạy bằng một câu UPDATE ... FROM
     * duy nhất để không đọc-rồi-ghi (tránh mất cập nhật khi hai request cùng
     * sửa biến thể của một sản phẩm).
     */
    abstract refreshAggregates(productId: string): Promise<void>;
}
