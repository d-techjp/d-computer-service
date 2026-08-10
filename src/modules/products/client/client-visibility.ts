import { ProductStatus } from '../entities/product.entity';

/**
 * Trạng thái sản phẩm mà khách được thấy. `OUT_OF_STOCK` vẫn hiển thị (khách cần
 * biết hàng đang hết để chờ), còn `DRAFT` và `ARCHIVED` thì coi như không tồn tại.
 *
 * Dùng chung cho mọi endpoint storefront của module products — sửa ở đây là sửa
 * đồng loạt, không sót chỗ nào.
 */
export const VISIBLE_STATUSES = [ProductStatus.ACTIVE, ProductStatus.OUT_OF_STOCK];
