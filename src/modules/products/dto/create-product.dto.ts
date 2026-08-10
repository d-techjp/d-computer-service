import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsBoolean,
    IsEnum,
    IsOptional,
    IsString,
    IsUUID,
    IsUrl,
    Matches,
    MaxLength,
    MinLength,
    ValidateNested,
} from 'class-validator';
import {
    toBoolean,
    toJsonArrayOf,
    toStringArray,
    toTrimmed,
} from '../../../common/transformers/transform.helpers';
import { SLUG_MESSAGE, SLUG_RULE } from '../../categories/dto/create-category.dto';
import { MAX_IMAGES_PER_REQUEST } from '../../uploads/constants/upload.constants';
import { ProductStatus, ProductType } from '../entities/product.entity';
import { CreateVariantDto } from './create-variant.dto';
import { ProductSpecificationDto } from './product-specification.dto';

/**
 * Tạo product master KÈM ít nhất một biến thể. Không cho tạo product "rỗng":
 * product không có variant nào là hàng không bán được, chỉ làm bẩn danh sách
 * và làm hỏng mọi phép tính giá/tồn kho ở tầng đọc.
 *
 * Sản phẩm đơn giản -> gửi đúng 1 phần tử trong `variants`.
 * Sản phẩm nhiều cấu hình -> gửi nhiều phần tử, hoặc gửi 1 rồi khai option và
 * dùng `POST /products/:id/variants/generate` để sinh phần còn lại.
 */
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

    @ApiPropertyOptional({ enum: ProductType, default: ProductType.STANDARD })
    @IsEnum(ProductType)
    @IsOptional()
    productType?: ProductType;

    @ApiPropertyOptional()
    @IsString()
    @MaxLength(500)
    @IsOptional()
    shortDescription?: string;

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

    @ApiPropertyOptional({
        type: [ProductSpecificationDto],
        example: [
            { name: 'CPU', value: 'Intel Core i5-1235U', position: 0 },
            { name: 'RAM', value: '16GB', position: 1 },
        ],
        description:
            'Thông số DÙNG CHUNG mọi biến thể, hiển thị theo `position`. Thông số khác nhau ' +
            'thì khai bằng option. Qua multipart thì gửi dưới dạng chuỗi JSON của mảng.',
    })
    @Transform(toJsonArrayOf(ProductSpecificationDto))
    @IsArray()
    @ArrayMaxSize(50)
    @ValidateNested({ each: true })
    @Type(() => ProductSpecificationDto)
    @IsOptional()
    specifications?: ProductSpecificationDto[];

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

    @ApiProperty({
        type: [CreateVariantDto],
        description:
            'Ít nhất 1 biến thể. Qua multipart thì gửi dưới dạng chuỗi JSON của mảng. ' +
            'Không phần tử nào đặt `isDefault` thì phần tử đầu tiên được chọn làm mặc định.',
    })
    @Transform(toJsonArrayOf(CreateVariantDto))
    @IsArray()
    @ArrayMinSize(1, { message: 'Sản phẩm phải có ít nhất 1 biến thể' })
    @ArrayMaxSize(100)
    @ValidateNested({ each: true })
    @Type(() => CreateVariantDto)
    variants: CreateVariantDto[];
}
