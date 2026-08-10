import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { OrderStatus, PaymentMethod, PaymentStatus } from '../../enums/order.enum';

/**
 * Bộ lọc đơn hàng cho khách. CỐ Ý không có `userId`: khách chỉ xem đơn của chính
 * mình, và `ClientOrdersService` ép `userId` theo token — nhận từ query sẽ thành
 * lỗ hổng xem đơn người khác.
 */
export class ClientQueryOrderDto extends PaginationQueryDto {
    @ApiPropertyOptional({ enum: OrderStatus })
    @IsEnum(OrderStatus)
    @IsOptional()
    status?: OrderStatus;

    @ApiPropertyOptional({ enum: PaymentStatus })
    @IsEnum(PaymentStatus)
    @IsOptional()
    paymentStatus?: PaymentStatus;

    @ApiPropertyOptional({ enum: PaymentMethod })
    @IsEnum(PaymentMethod)
    @IsOptional()
    paymentMethod?: PaymentMethod;

    @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
    @IsDateString()
    @IsOptional()
    from?: string;

    @ApiPropertyOptional({ example: '2026-12-31T23:59:59.999Z' })
    @IsDateString()
    @IsOptional()
    to?: string;
}
