import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaymentMethod } from '../../orders/enums/order.enum';
import { CheckoutContactDto } from './checkout-contact.dto';

/**
 * Đặt hàng = xem trước + thông tin liên lạc + chọn hình thức thanh toán.
 *
 * KHÔNG nhận `discount`/`shippingFee` — backend tự tính, xem `OrdersService.create`.
 */
export class PlaceOrderDto extends CheckoutContactDto {
    @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.COD })
    @IsEnum(PaymentMethod)
    @IsOptional()
    paymentMethod?: PaymentMethod;
}
