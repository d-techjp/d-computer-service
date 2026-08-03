import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { OrderStatus, PaymentMethod, PaymentStatus } from '../enums/order.enum';

export class QueryOrderDto extends PaginationQueryDto {
    @ApiPropertyOptional({ format: 'uuid' })
    @IsUUID()
    @IsOptional()
    userId?: string;

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
