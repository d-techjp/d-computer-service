import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { toBoolean } from '../../../common/transformers/transform.helpers';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ProductStatus, ProductType } from '../entities/product.entity';

export class QueryProductDto extends PaginationQueryDto {
    @ApiPropertyOptional({ enum: ProductType })
    @IsEnum(ProductType)
    @IsOptional()
    productType?: ProductType;

    @ApiPropertyOptional({ format: 'uuid' })
    @IsUUID()
    @IsOptional()
    categoryId?: string;

    @ApiPropertyOptional({
        default: false,
        description: 'true = lấy cả sản phẩm thuộc danh mục con của categoryId',
    })
    @Transform(toBoolean)
    @IsBoolean()
    @IsOptional()
    includeSubCategories?: boolean;

    @ApiPropertyOptional({ format: 'uuid' })
    @IsUUID()
    @IsOptional()
    brandId?: string;

    @ApiPropertyOptional({ enum: ProductStatus })
    @IsEnum(ProductStatus)
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
