import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrderStatus, PaymentStatus } from '../enums/order.enum';

export class UpdateOrderStatusDto {
    @ApiProperty({ enum: OrderStatus })
    @IsEnum(OrderStatus)
    status: OrderStatus;

    @ApiPropertyOptional({ description: 'Bắt buộc khi chuyển sang trạng thái cancelled' })
    @IsString()
    @MaxLength(500)
    @IsOptional()
    reason?: string;
}

export class UpdatePaymentStatusDto {
    @ApiProperty({ enum: PaymentStatus })
    @IsEnum(PaymentStatus)
    paymentStatus: PaymentStatus;
}

export class CancelOrderDto {
    @ApiPropertyOptional({ example: 'Khách đổi ý' })
    @IsString()
    @MaxLength(500)
    @IsOptional()
    reason?: string;
}
