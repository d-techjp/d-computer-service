import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
    Min,
    MinLength,
    ValidateNested,
} from 'class-validator';
import { toTrimmed, toUpperTrimmed } from '../../../common/transformers/transform.helpers';

export class ProductOptionValueInputDto {
    @ApiProperty({ example: '16GB' })
    @Transform(toTrimmed)
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    value: string;

    @ApiPropertyOptional({ example: 0, default: 0 })
    @Type(() => Number)
    @IsInt()
    @Min(0)
    @IsOptional()
    position?: number;
}

export class ProductOptionInputDto {
    @ApiProperty({ example: 'RAM' })
    @Transform(toTrimmed)
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    name: string;

    @ApiProperty({ type: [ProductOptionValueInputDto] })
    @IsArray()
    @ArrayMinSize(1, { message: 'Mỗi option phải có ít nhất 1 giá trị' })
    @ArrayMaxSize(50)
    @ValidateNested({ each: true })
    @Type(() => ProductOptionValueInputDto)
    values: ProductOptionValueInputDto[];

    @ApiPropertyOptional({ example: 0, default: 0 })
    @Type(() => Number)
    @IsInt()
    @Min(0)
    @IsOptional()
    position?: number;
}

/**
 * Thay thế TOÀN BỘ bộ option của sản phẩm (PUT semantics). Option/value không
 * còn trong payload sẽ bị xoá — service từ chối nếu value đó đang được biến thể
 * nào sử dụng, để không làm mồ côi tổ hợp đang bán.
 */
export class SetProductOptionsDto {
    @ApiProperty({ type: [ProductOptionInputDto] })
    @IsArray()
    @ArrayMaxSize(5, { message: 'Tối đa 5 trục biến thể cho mỗi sản phẩm' })
    @ValidateNested({ each: true })
    @Type(() => ProductOptionInputDto)
    options: ProductOptionInputDto[];
}

/** Sinh biến thể cho mọi tổ hợp option chưa tồn tại. */
export class GenerateVariantsDto {
    @ApiProperty({
        example: 'DELL-V3520',
        description: 'SKU sinh ra dạng `{skuPrefix}-{slug tổ hợp}`, ví dụ DELL-V3520-16GB-512GB',
    })
    @Transform(toUpperTrimmed)
    @IsString()
    @MinLength(2)
    @MaxLength(60)
    skuPrefix: string;

    @ApiProperty({ example: 15990000, description: 'Giá khởi tạo cho mọi biến thể sinh ra' })
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    price: number;

    @ApiPropertyOptional({ example: 0, default: 0, description: 'Tồn kho khởi tạo' })
    @Type(() => Number)
    @IsInt()
    @Min(0)
    @IsOptional()
    stock?: number;
}
