import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaymentMethod } from '../../orders/enums/order.enum';
import { CheckoutPreviewDto } from './checkout-preview.dto';

/**
 * Đặt hàng = xem trước + chọn hình thức thanh toán + ghi chú. Kế thừa thẳng
 * `CheckoutPreviewDto` (không dùng `PartialType`/`IntersectionType` của
 * `@nestjs/mapped-types` vì chúng không kế thừa prototype).
 *
 * KHÔNG nhận `discount`/`shippingFee` — backend tự tính, xem `OrdersService.create`.
 */
export class PlaceOrderDto extends CheckoutPreviewDto {
    @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.COD })
    @IsEnum(PaymentMethod)
    @IsOptional()
    paymentMethod?: PaymentMethod;

    @ApiPropertyOptional({ description: 'Ghi chú cho cả đơn hàng' })
    @IsString()
    @MaxLength(500)
    @IsOptional()
    note?: string;
}
