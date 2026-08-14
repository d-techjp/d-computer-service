import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { MANUAL_IMPORT_REASONS, InventoryReasonCode } from '../enums/inventory.enum';

export class CreateInventoryImportDto {
    @ApiProperty({ format: 'uuid' })
    @IsUUID()
    variantId: string;

    @ApiProperty({ example: 20, minimum: 1 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    quantity: number;

    @ApiProperty({ enum: MANUAL_IMPORT_REASONS })
    @IsIn(MANUAL_IMPORT_REASONS)
    reasonCode: InventoryReasonCode;

    @ApiPropertyOptional({ example: 'Nhập hàng lô tháng 8' })
    @IsString()
    @MaxLength(500)
    @IsOptional()
    note?: string;
}
