import type { ProductDescription } from '../entities/product-description.entity';

export abstract class ProductDescriptionsRepository {
    abstract findByProductId(productId: string): Promise<ProductDescription | null>;

    /** Tạo mới nếu sản phẩm chưa có mô tả chi tiết, ngược lại cập nhật content. */
    abstract upsert(productId: string, content: string): Promise<ProductDescription>;
}
