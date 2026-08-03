import { toTrimmed, toUpperTrimmed } from '../../../common/transformers/transform.helpers';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsInt,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    IsUUID,
    IsUrl,
    Matches,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';
import { SLUG_MESSAGE, SLUG_RULE } from '../../categories/dto/create-category.dto';
import { ProductStatus } from '../entities/product.entity';

export class CreateProductDto {
    @ApiProperty({ example: 'Laptop Dell Vostro 3520' })
    @Transform(toTrimmed)
    @IsString()
    @MinLength(2)
    @MaxLength(255)
    name: string;

    @ApiPropertyOptional({ description: 'Bỏ trống để tự sinh từ name' })
    @IsString()
    @MaxLength(300)
    @Matches(SLUG_RULE, { message: SLUG_MESSAGE })
    @IsOptional()
    slug?: string;

    @ApiProperty({ example: 'DELL-V3520-I5' })
    @Transform(toUpperTrimmed)
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    sku: string;

    @ApiPropertyOptional()
    @IsString()
    @MaxLength(500)
    @IsOptional()
    shortDescription?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: 15990000 })
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    price: number;

    @ApiPropertyOptional({ example: 17990000 })
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @IsOptional()
    compareAtPrice?: number;

    @ApiPropertyOptional({ example: 12000000 })
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @IsOptional()
    costPrice?: number;

    @ApiPropertyOptional({ example: 25, default: 0 })
    @Type(() => Number)
    @IsInt()
    @Min(0)
    @IsOptional()
    stock?: number;

    @ApiPropertyOptional({ example: 5, default: 0 })
    @Type(() => Number)
    @IsInt()
    @Min(0)
    @IsOptional()
    lowStockThreshold?: number;

    @ApiPropertyOptional({ example: 'https://cdn.dcomputer.local/products/dell-vostro-3520.jpg' })
    @IsUrl()
    @MaxLength(500)
    @IsOptional()
    thumbnail?: string;

    @ApiPropertyOptional({
        type: [String],
        example: ['https://cdn.dcomputer.local/products/dell-vostro-3520-1.jpg'],
    })
    @IsArray()
    @IsUrl({}, { each: true })
    @IsOptional()
    images?: string[];

    @ApiPropertyOptional({ example: { CPU: 'Intel Core i5-1235U', RAM: '16GB DDR4' } })
    @IsObject()
    @IsOptional()
    specifications?: Record<string, string>;

    @ApiPropertyOptional({ enum: ProductStatus, default: ProductStatus.DRAFT })
    @IsEnum(ProductStatus)
    @IsOptional()
    status?: ProductStatus;

    @ApiPropertyOptional({ default: false })
    @IsBoolean()
    @IsOptional()
    isFeatured?: boolean;

    @ApiPropertyOptional({ format: 'uuid' })
    @IsUUID()
    @IsOptional()
    categoryId?: string;

    @ApiPropertyOptional({ format: 'uuid' })
    @IsUUID()
    @IsOptional()
    brandId?: string;
}
