import {
    toBoolean,
    toJsonObject,
    toStringArray,
    toTrimmed,
    toUpperTrimmed,
} from '../../../common/transformers/transform.helpers';
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
import { MAX_IMAGES_PER_REQUEST } from '../../uploads/constants/upload.constants';
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

    @ApiPropertyOptional({
        example: 'https://cdn.dcomputer.local/products/dell-vostro-3520.jpg',
        description: 'URL ảnh có sẵn — bị ghi đè nếu gửi kèm `thumbnailFile`.',
    })
    @IsUrl()
    @MaxLength(500)
    @IsOptional()
    thumbnail?: string;

    /**
     * Field Swagger-only cho multipart: multer tách khỏi body trước khi tới ValidationPipe
     * nên luôn `undefined` ở đây. `@IsOptional()` chỉ để đăng ký field với class-validator —
     * thiếu nó thì `forbidNonWhitelisted` sẽ reject mọi request (kể cả JSON không hề gửi field này),
     * vì target ES2023 khiến field không-initializer vẫn thành own-property `undefined`.
     */
    @ApiPropertyOptional({
        type: 'string',
        format: 'binary',
        description: 'Upload ảnh thumbnail trực tiếp lên R2, thay vì truyền URL ở `thumbnail`.',
    })
    @IsOptional()
    thumbnailFile?: unknown;

    @ApiPropertyOptional({
        type: [String],
        example: ['https://cdn.dcomputer.local/products/dell-vostro-3520-1.jpg'],
        description: 'URL ảnh có sẵn — gộp thêm với ảnh upload qua `imagesFiles` (nếu có).',
    })
    @Transform(toStringArray)
    @IsArray()
    @IsUrl({}, { each: true })
    @IsOptional()
    images?: string[];

    /** Field Swagger-only cho multipart — xem lý do cần `@IsOptional()` ở `thumbnailFile`. */
    @ApiPropertyOptional({
        type: 'array',
        items: { type: 'string', format: 'binary' },
        description: `Upload ảnh sản phẩm trực tiếp lên R2 (tối đa ${MAX_IMAGES_PER_REQUEST} file), gộp thêm vào \`images\`.`,
    })
    @IsOptional()
    imagesFiles?: unknown;

    @ApiPropertyOptional({ example: { CPU: 'Intel Core i5-1235U', RAM: '16GB DDR4' } })
    @Transform(toJsonObject)
    @IsObject()
    @IsOptional()
    specifications?: Record<string, string>;

    @ApiPropertyOptional({ enum: ProductStatus, default: ProductStatus.DRAFT })
    @IsEnum(ProductStatus)
    @IsOptional()
    status?: ProductStatus;

    @ApiPropertyOptional({ default: false })
    @Transform(toBoolean)
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
