import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { toTrimmed } from '../../../common/transformers/transform.helpers';
import { ORDER_LOCALES, type OrderLocale } from '../../orders/enums/order.enum';
import { CheckoutPreviewDto } from './checkout-preview.dto';

/**
 * Phần chung của hai cửa đặt hàng (`POST /checkout` và `POST /checkout/stripe`):
 * thông tin liên lạc + ngôn ngữ. Email BẮT BUỘC — khách vãng lai không có tài
 * khoản, đây là kênh duy nhất để gửi xác nhận đơn và báo đổi trạng thái.
 *
 * Kế thừa thẳng `CheckoutPreviewDto` (không dùng mapped-types — chúng không kế
 * thừa prototype, xem `PlaceOrderDto`).
 */
export class CheckoutContactDto extends CheckoutPreviewDto {
    @ApiProperty({ example: 'khach@example.com', description: 'Nhận email xác nhận đơn hàng' })
    @Transform(toTrimmed)
    @IsNotEmpty({ message: 'Vui lòng nhập email' })
    @IsEmail({}, { message: 'Email không hợp lệ' })
    @MaxLength(255, { message: 'Email tối đa 255 ký tự' })
    email: string;

    @ApiPropertyOptional({
        enum: ORDER_LOCALES,
        default: 'ja',
        description: 'Ngôn ngữ storefront — dùng cho email và trang thanh toán',
    })
    @IsIn(ORDER_LOCALES)
    @IsOptional()
    locale?: OrderLocale;

    @ApiPropertyOptional({ description: 'Ghi chú cho cả đơn hàng' })
    @IsString()
    @MaxLength(500)
    @IsOptional()
    note?: string;
}
