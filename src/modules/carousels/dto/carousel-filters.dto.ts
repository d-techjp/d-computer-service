import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
    IsBoolean,
    IsEnum,
    IsIn,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    Min,
} from 'class-validator';
import { SortOrder } from '../../../common/dto/pagination-query.dto';
import { toBoolean, toTrimmed } from '../../../common/transformers/transform.helpers';
import {
    PRODUCT_SORTABLE_COLUMNS,
    type ProductSortableColumn,
} from '../../products/domain/product-sortable-columns';
import { ProductType } from '../../products/entities/product.entity';
import type { CarouselFilters } from '../domain/carousel-filters';

/**
 * Bộ lọc admin gửi lên khi tạo/sửa carousel — đúng state của form lọc.
 *
 * `whitelist` + `forbidNonWhitelisted` của ValidationPipe áp cả cho object lồng
 * nhau, nên key lạ (`status`, `page`, `limit`, `filterQuery`...) bị trả 400 ngay
 * chứ không âm thầm nằm lại trong jsonb.
 */
export class CarouselFiltersDto implements CarouselFilters {
    @ApiPropertyOptional({
        description: 'Từ khoá; AND với từ khoá khách gõ thêm trên trang danh sách',
    })
    @Transform(toTrimmed)
    @IsString()
    @MaxLength(255)
    @IsOptional()
    search?: string;

    @ApiPropertyOptional({ format: 'uuid' })
    @IsUUID()
    @IsOptional()
    categoryId?: string;

    @ApiPropertyOptional({
        default: false,
        description: 'true = lấy cả sản phẩm thuộc danh mục con',
    })
    @Transform(toBoolean)
    @IsBoolean()
    @IsOptional()
    includeSubCategories?: boolean;

    @ApiPropertyOptional({ format: 'uuid' })
    @IsUUID()
    @IsOptional()
    brandId?: string;

    @ApiPropertyOptional({ enum: ProductType })
    @IsEnum(ProductType)
    @IsOptional()
    productType?: ProductType;

    @ApiPropertyOptional({ example: 15000000 })
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

    @ApiPropertyOptional({ enum: PRODUCT_SORTABLE_COLUMNS })
    @IsIn(PRODUCT_SORTABLE_COLUMNS)
    @IsOptional()
    sortBy?: ProductSortableColumn;

    @ApiPropertyOptional({ enum: SortOrder })
    @IsEnum(SortOrder)
    @IsOptional()
    sortOrder?: SortOrder;
}
