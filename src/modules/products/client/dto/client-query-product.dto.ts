import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { toBoolean } from '../../../../common/transformers/transform.helpers';
import { ProductStatus, ProductType } from '../../entities/product.entity';
import { VISIBLE_STATUSES } from '../client-visibility';

/**
 * Bộ lọc storefront được phép dùng. `status` chỉ nhận trạng thái công khai; service
 * vẫn áp thêm `VISIBLE_STATUSES` nên client không thể nới rộng sang draft/archive.
 *
 * `category`/`brand` nhận slug (không phải id) để URL trên storefront thân thiện SEO;
 * `ClientProductsService` tự resolve sang uuid trước khi giao cho `ProductsService`.
 */
export class ClientQueryProductDto extends PaginationQueryDto {
    @ApiPropertyOptional({ enum: ProductType })
    @IsEnum(ProductType)
    @IsOptional()
    productType?: ProductType;

    @ApiPropertyOptional({ example: 'laptop', description: 'Slug danh mục' })
    @IsString()
    @IsOptional()
    category?: string;

    @ApiPropertyOptional({
        default: false,
        description: 'true = lấy cả sản phẩm thuộc danh mục con của category',
    })
    @Transform(toBoolean)
    @IsBoolean()
    @IsOptional()
    includeSubCategories?: boolean;

    @ApiPropertyOptional({ example: 'dell', description: 'Slug thương hiệu' })
    @IsString()
    @IsOptional()
    brand?: string;

    @ApiPropertyOptional({ enum: VISIBLE_STATUSES })
    @IsIn(VISIBLE_STATUSES)
    @IsOptional()
    status?: ProductStatus;

    @ApiPropertyOptional({ example: 5000000 })
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    minPrice?: number;

    @ApiPropertyOptional({ example: 30000000 })
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    maxPrice?: number;

    @ApiPropertyOptional({ description: 'true = chỉ lấy sản phẩm còn hàng' })
    @Transform(toBoolean)
    @IsBoolean()
    @IsOptional()
    inStock?: boolean;

    @ApiPropertyOptional()
    @Transform(toBoolean)
    @IsBoolean()
    @IsOptional()
    isFeatured?: boolean;
}
