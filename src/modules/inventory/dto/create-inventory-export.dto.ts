import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { MANUAL_EXPORT_REASONS, InventoryReasonCode } from '../enums/inventory.enum';

export class CreateInventoryExportDto {
    @ApiProperty({ format: 'uuid' })
    @IsUUID()
    variantId: string;

    @ApiProperty({ example: 3, minimum: 1 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    quantity: number;

    @ApiProperty({ enum: MANUAL_EXPORT_REASONS })
    @IsIn(MANUAL_EXPORT_REASONS)
    reasonCode: InventoryReasonCode;

    @ApiPropertyOptional({ example: 'Hàng lỗi màn hình, loại khỏi kho' })
    @IsString()
    @MaxLength(500)
    @IsOptional()
    note?: string;
}
