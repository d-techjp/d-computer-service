import { ApiProperty } from '@nestjs/swagger';
import { ShippingAddressDto } from '../../../orders/dto/create-order.dto';
import { PaymentMethod } from '../../../orders/enums/order.enum';
import { PublicCartItemDto } from './public-cart.dto';

/**
 * Kết quả `POST /checkout/preview` — "thông tin đơn hàng" tính từ giỏ sau khi
 * khách đã nhập địa chỉ.
 *
 * Là class chứ không phải interface để `@nestjs/swagger` sinh được schema: spec
 * xuất ra từ `ts-node` không chạy CLI plugin nên không suy ra kiểu trả về từ
 * TypeScript, chỉ đọc được `@ApiProperty`.
 */
export class CheckoutSummaryDto {
    @ApiProperty({ type: [PublicCartItemDto], description: 'Cùng khuôn dạng dòng của giỏ hàng' })
    items: PublicCartItemDto[];

    @ApiProperty({ example: 31980000, description: 'Tổng tiền hàng' })
    subtotal: number;

    @ApiProperty({ example: 0, description: 'Hiện luôn 0 — chưa có mã giảm giá' })
    discount: number;

    @ApiProperty({ example: 0, description: 'Hiện luôn 0 — chưa tính phí vận chuyển' })
    shippingFee: number;

    @ApiProperty({ example: 31980000, description: 'subtotal - discount + shippingFee' })
    total: number;

    @ApiProperty({
        type: ShippingAddressDto,
        description: 'Địa chỉ đã chuẩn hoá để khách xác nhận',
    })
    shippingAddress: ShippingAddressDto;

    @ApiProperty({ enum: PaymentMethod, isArray: true })
    paymentMethods: PaymentMethod[];

    @ApiProperty({ description: 'false khi có dòng không còn mua được → FE khoá nút đặt hàng' })
    canPlaceOrder: boolean;
}
