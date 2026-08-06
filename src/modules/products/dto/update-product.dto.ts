import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

/**
 * `variants` bị loại: biến thể có vòng đời riêng (thêm/sửa/xoá/điều chỉnh kho)
 * và được quản lý qua `/products/:productId/variants` + `/variants/:id`.
 * Nhận cả mảng ở đây sẽ mập mờ giữa "thay thế toàn bộ" và "thêm mới".
 *
 * `productType` cũng bị loại: đổi standard <-> bundle sau khi đã có biến thể /
 * đơn hàng sẽ làm sai toàn bộ logic tồn kho. Muốn đổi thì tạo sản phẩm mới.
 */
export class UpdateProductDto extends PartialType(
    OmitType(CreateProductDto, ['variants', 'productType']),
) {}
