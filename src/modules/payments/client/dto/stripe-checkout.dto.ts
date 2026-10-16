import { ApiProperty } from '@nestjs/swagger';
import { CheckoutContactDto } from '../../../cart/dto/checkout-contact.dto';
import { OrderStatus, PaymentStatus } from '../../../orders/enums/order.enum';

/**
 * Giống `PlaceOrderDto` nhưng không có `paymentMethod` (luôn là Stripe; khách
 * chọn thẻ hay PayPay trên trang của Stripe).
 *
 * `locale` (từ `CheckoutContactDto`) quyết định URL quay về — nhận locale chứ
 * không nhận URL: cho khách tự gửi URL là mở cửa cho open redirect qua chính
 * trang thanh toán của mình.
 */
export class StripeCheckoutDto extends CheckoutContactDto {}

export class StripeCheckoutResultDto {
    // Tên `id` (không phải `orderId`) để `ActivityLogInterceptor` ghi được resourceId
    @ApiProperty({ format: 'uuid', description: 'Id đơn hàng' })
    id: string;

    @ApiProperty({ example: 'DH20261016-A1B2C3' })
    orderCode: string;

    @ApiProperty({ example: 'https://checkout.stripe.com/c/pay/cs_test_...' })
    checkoutUrl: string;
}

/**
 * Trả về cho trang success. Chỉ có mã đơn + trạng thái — ai cầm session id
 * cũng gọi được (khách vãng lai không có token), nên không kèm địa chỉ/SĐT.
 */
export class StripeSessionStatusDto {
    @ApiProperty({ example: 'DH20261016-A1B2C3' })
    orderCode: string;

    @ApiProperty({ example: 32000 })
    total: number;

    @ApiProperty({ enum: OrderStatus })
    status: OrderStatus;

    @ApiProperty({ enum: PaymentStatus })
    paymentStatus: PaymentStatus;
}
