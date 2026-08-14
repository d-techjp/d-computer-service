import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDefined, IsUUID, ValidateNested } from 'class-validator';
import { ShippingAddressDto } from '../../orders/dto/create-order.dto';

/**
 * Địa chỉ bắt buộc ngay từ bước xem trước: đúng luồng "khách nhập địa chỉ + số
 * điện thoại xong mới hiện thông tin tiền, rồi mới tới nút đặt hàng". Hiện phí
 * ship luôn 0 nên địa chỉ chưa ảnh hưởng số tiền, nhưng nhận sẵn từ đây thì lúc
 * gắn phí ship thật sẽ không phải đổi contract lẫn luồng FE.
 *
 * Muốn xem tạm tính trước khi có địa chỉ thì dùng `GET /carts/:cartId`.
 */
export class CheckoutPreviewDto {
    @ApiProperty({ format: 'uuid' })
    @IsUUID()
    cartId: string;

    // `@IsDefined()` là bắt buộc: `@ValidateNested()` bỏ qua giá trị `undefined`
    // nên thiếu hẳn `shippingAddress` sẽ lọt qua validation nếu chỉ có nó.
    @ApiProperty({ type: ShippingAddressDto })
    @IsDefined({ message: 'Vui lòng nhập địa chỉ giao hàng' })
    @ValidateNested()
    @Type(() => ShippingAddressDto)
    shippingAddress: ShippingAddressDto;
}
