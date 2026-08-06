import type { ProductVariant } from '../entities/product-variant.entity';

export abstract class ProductVariantsRepository {
    abstract create(data: Partial<ProductVariant>): ProductVariant;

    abstract save(variant: ProductVariant): Promise<ProductVariant>;

    abstract saveMany(variants: ProductVariant[]): Promise<ProductVariant[]>;

    /** Kèm `product` để service kiểm tra productType mà không cần query thêm. */
    abstract findById(id: string): Promise<ProductVariant | null>;

    abstract findByIds(ids: string[]): Promise<ProductVariant[]>;

    abstract findByProductId(productId: string): Promise<ProductVariant[]>;

    abstract findDefaultByProductId(productId: string): Promise<ProductVariant | null>;

    abstract countByProductId(productId: string): Promise<number>;

    abstract countBySku(sku: string, excludeId?: string): Promise<number>;

    abstract softRemove(variant: ProductVariant): Promise<void>;

    /**
     * Bỏ cờ mặc định ở mọi biến thể khác — giữ đúng 1 biến thể mặc định / sản phẩm.
     * Bỏ trống `exceptVariantId` để xoá cờ ở TẤT CẢ biến thể (dùng khi biến thể
     * mới còn chưa có id, ví dụ lúc tạo).
     *
     * Phải gọi TRƯỚC khi lưu biến thể sẽ mang cờ `true` — partial unique index
     * `is_default` không deferrable, nên nếu lưu trước rồi mới clear, câu lưu đó
     * tự vi phạm ràng buộc ngay khi có 2 dòng cùng `true`, dù chỉ thoáng qua.
     */
    abstract clearDefaultFlag(productId: string, exceptVariantId?: string): Promise<void>;

    /**
     * Biến thể dưới ngưỡng cảnh báo. Bỏ qua biến thể không theo dõi kho và
     * biến thể của sản phẩm đã archive.
     */
    abstract findLowStock(limit: number): Promise<ProductVariant[]>;
}
