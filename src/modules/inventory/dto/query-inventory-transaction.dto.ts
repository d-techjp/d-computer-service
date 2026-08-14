import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
    InventoryReasonCode,
    InventoryReferenceType,
    InventoryTransactionType,
} from '../enums/inventory.enum';

export class QueryInventoryTransactionDto extends PaginationQueryDto {
    @ApiPropertyOptional({ format: 'uuid' })
    @IsUUID()
    @IsOptional()
    variantId?: string;

    @ApiPropertyOptional({ enum: InventoryTransactionType })
    @IsEnum(InventoryTransactionType)
    @IsOptional()
    type?: InventoryTransactionType;

    @ApiPropertyOptional({ enum: InventoryReasonCode })
    @IsEnum(InventoryReasonCode)
    @IsOptional()
    reasonCode?: InventoryReasonCode;

    @ApiPropertyOptional({ enum: InventoryReferenceType })
    @IsEnum(InventoryReferenceType)
    @IsOptional()
    referenceType?: InventoryReferenceType;

    @ApiPropertyOptional({
        format: 'uuid',
        description: 'Vd: id đơn hàng khi referenceType = order',
    })
    @IsUUID()
    @IsOptional()
    referenceId?: string;

    @ApiPropertyOptional({ format: 'uuid' })
    @IsUUID()
    @IsOptional()
    performedById?: string;

    @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
    @IsDateString()
    @IsOptional()
    from?: string;

    @ApiPropertyOptional({ example: '2026-12-31T23:59:59.999Z' })
    @IsDateString()
    @IsOptional()
    to?: string;
}
