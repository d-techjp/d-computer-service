import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
    ArrayMaxSize,
    IsArray,
    IsBoolean,
    IsEnum,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    IsUrl,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';
import {
    toBoolean,
    toStringArray,
    toTrimmed,
    toUpperTrimmed,
} from '../../../common/transformers/transform.helpers';
import { BundleInventoryPolicy } from '../entities/product-variant.entity';

/**
 * Dùng chung cho hai đường vào:
 * - lồng trong `CreateProductDto.variants` khi tạo sản phẩm;
 * - body của `POST /products/:productId/variants` khi thêm biến thể sau.
 */
export class CreateVariantDto {
    @ApiPropertyOptional({
        example: '16GB / 512GB',
        description: 'Bỏ trống thì lấy theo tổ hợp option, không có option thì lấy tên sản phẩm',
    })
    @Transform(toTrimmed)
    @IsString()
    @MaxLength(255)
    @IsOptional()
    name?: string;

    @ApiProperty({ example: 'DELL-V3520-I5-16-512' })
    @Transform(toUpperTrimmed)
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    sku: string;

    @ApiPropertyOptional({ example: '8935001234567' })
    @Transform(toUpperTrimmed)
    @IsString()
    @MaxLength(64)
    @IsOptional()
    barcode?: string;

    @ApiProperty({ example: 15990000 })
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    price: number;

    @ApiPropertyOptional({ example: 17990000, description: 'Phải >= price' })
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @IsOptional()
    compareAtPrice?: number;

    @ApiPropertyOptional({ example: 12000000, description: 'Giá vốn — chỉ nội bộ' })
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

    @ApiPropertyOptional({ example: 1800, description: 'Khối lượng (gram)' })
    @Type(() => Number)
    @IsInt()
    @Min(0)
    @IsOptional()
    weightGrams?: number;

    @ApiPropertyOptional({ description: 'URL ảnh riêng của biến thể' })
    @IsUrl()
    @MaxLength(500)
    @IsOptional()
    thumbnail?: string;

    @ApiPropertyOptional({ type: [String] })
    @Transform(toStringArray)
    @IsArray()
    @IsUrl({}, { each: true })
    @IsOptional()
    images?: string[];

    @ApiPropertyOptional({ example: 0, default: 0 })
    @Type(() => Number)
    @IsInt()
    @Min(0)
    @IsOptional()
    position?: number;

    @ApiPropertyOptional({
        default: false,
        description: 'Biến thể hiển thị mặc định. Không set thì biến thể đầu tiên được chọn.',
    })
    @Transform(toBoolean)
    @IsBoolean()
    @IsOptional()
    isDefault?: boolean;

    @ApiPropertyOptional({ default: true })
    @Transform(toBoolean)
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @ApiPropertyOptional({
        default: true,
        description: 'false = không trừ kho (dịch vụ, hàng đặt trước)',
    })
    @Transform(toBoolean)
    @IsBoolean()
    @IsOptional()
    trackInventory?: boolean;

    @ApiPropertyOptional({
        enum: BundleInventoryPolicy,
        description:
            'Bắt buộc khi product.productType = bundle, phải bỏ trống với standard/service.',
    })
    @IsEnum(BundleInventoryPolicy)
    @IsOptional()
    bundleInventoryPolicy?: BundleInventoryPolicy;

    @ApiPropertyOptional({
        type: [String],
        format: 'uuid',
        description:
            'Id các ProductOptionValue tạo nên tổ hợp này. Phải đủ 1 value cho mỗi option của sản phẩm.',
    })
    @Transform(toStringArray)
    @IsArray()
    @ArrayMaxSize(10)
    @IsUUID('4', { each: true })
    @IsOptional()
    optionValueIds?: string[];
}
