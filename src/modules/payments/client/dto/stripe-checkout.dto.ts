import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { CheckoutPreviewDto } from '../../../cart/dto/checkout-preview.dto';
import { OrderStatus, PaymentStatus } from '../../../orders/enums/order.enum';

/** Ngôn ngữ storefront — vừa là đoạn đầu URL quay về, vừa là ngôn ngữ trang Stripe. */
export const STOREFRONT_LOCALES = ['ja', 'vi'] as const;
export type StorefrontLocale = (typeof STOREFRONT_LOCALES)[number];

/**
 * Giống `PlaceOrderDto` nhưng không có `paymentMethod` (luôn là Stripe; khách
 * chọn thẻ hay PayPay trên trang của Stripe). Kế thừa thẳng `CheckoutPreviewDto`
 * vì cùng lý do với `PlaceOrderDto` — mapped-types không kế thừa prototype.
 *
 * Nhận `locale` chứ không nhận URL quay về: cho khách tự gửi URL là mở cửa cho
 * open redirect qua chính trang thanh toán của mình.
 */
export class StripeCheckoutDto extends CheckoutPreviewDto {
    @ApiPropertyOptional({ description: 'Ghi chú cho cả đơn hàng' })
    @IsString()
    @MaxLength(500)
    @IsOptional()
    note?: string;

    @ApiPropertyOptional({ enum: STOREFRONT_LOCALES, default: 'ja' })
    @IsIn(STOREFRONT_LOCALES)
    @IsOptional()
    locale?: StorefrontLocale;
}

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
