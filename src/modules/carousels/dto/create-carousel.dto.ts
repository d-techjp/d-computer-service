import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
    IsBoolean,
    IsInt,
    IsObject,
    IsOptional,
    IsString,
    IsUrl,
    Matches,
    Max,
    MaxLength,
    Min,
    MinLength,
    ValidateNested,
} from 'class-validator';
import { toInteger, toTrimmed } from '../../../common/transformers/transform.helpers';
import { SLUG_MESSAGE, SLUG_RULE } from '../../categories/dto/create-category.dto';
import { CAROUSEL_DEFAULT_ITEM_LIMIT, CAROUSEL_MAX_ITEM_LIMIT } from '../entities/carousel.entity';
import { CarouselFiltersDto } from './carousel-filters.dto';

export class CreateCarouselDto {
    @ApiProperty({ example: 'Laptop gaming dưới 30 triệu' })
    @Transform(toTrimmed)
    @IsString()
    @MinLength(1)
    @MaxLength(150)
    name: string;

    @ApiPropertyOptional({
        example: 'laptop-gaming-duoi-30-trieu',
        description: 'Bỏ trống để tự sinh từ name',
    })
    @IsString()
    @MaxLength(180)
    @Matches(SLUG_RULE, { message: SLUG_MESSAGE })
    @IsOptional()
    slug?: string;

    @ApiPropertyOptional({ example: 'Cấu hình mạnh, giá vừa túi tiền' })
    @Transform(toTrimmed)
    @IsString()
    @MaxLength(255)
    @IsOptional()
    subtitle?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ example: 'https://cdn.dcomputer.local/carousels/gaming.jpg' })
    @IsUrl()
    @MaxLength(500)
    @IsOptional()
    imageUrl?: string;

    @ApiPropertyOptional({
        type: CarouselFiltersDto,
        default: {},
        description:
            'State của form lọc. Bỏ trống hoặc `{}` = không lọc, carousel lấy mọi sản phẩm ' +
            'hiển thị được. Server sinh `filterQuery` từ đây.',
    })
    @ValidateNested()
    @Type(() => CarouselFiltersDto)
    @IsObject()
    @IsOptional()
    filters?: CarouselFiltersDto;

    @ApiPropertyOptional({ default: CAROUSEL_DEFAULT_ITEM_LIMIT, maximum: CAROUSEL_MAX_ITEM_LIMIT })
    @Transform(toInteger)
    @IsInt()
    @Min(1)
    @Max(CAROUSEL_MAX_ITEM_LIMIT)
    @IsOptional()
    itemLimit?: number;

    @ApiPropertyOptional({ default: 0 })
    @Transform(toInteger)
    @IsInt()
    @Min(0)
    @IsOptional()
    sortOrder?: number;

    @ApiPropertyOptional({ default: true })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
