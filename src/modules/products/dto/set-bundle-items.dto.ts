import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsBoolean,
    IsInt,
    IsOptional,
    IsUUID,
    Min,
    ValidateNested,
} from 'class-validator';
import { toBoolean } from '../../../common/transformers/transform.helpers';

export class BundleItemInputDto {
    @ApiProperty({
        format: 'uuid',
        description: 'Variant thành phần — phải thuộc product standard',
    })
    @IsUUID()
    componentVariantId: string;

    @ApiPropertyOptional({ example: 1, default: 1 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    quantity?: number;

    @ApiPropertyOptional({ example: 0, default: 0 })
    @Type(() => Number)
    @IsInt()
    @Min(0)
    @IsOptional()
    position?: number;

    @ApiPropertyOptional({
        default: false,
        description: 'true = quà tặng kèm, không tính vào tồn kho combo',
    })
    @Transform(toBoolean)
    @IsBoolean()
    @IsOptional()
    isOptional?: boolean;
}

/** Thay thế TOÀN BỘ danh sách thành phần của một combo (PUT semantics). */
export class SetBundleItemsDto {
    @ApiProperty({ type: [BundleItemInputDto] })
    @IsArray()
    @ArrayMinSize(1, { message: 'Combo phải có ít nhất 1 thành phần' })
    @ArrayMaxSize(50)
    @ValidateNested({ each: true })
    @Type(() => BundleItemInputDto)
    items: BundleItemInputDto[];
}
