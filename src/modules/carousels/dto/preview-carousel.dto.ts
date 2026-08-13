import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsObject, IsOptional, Max, Min, ValidateNested } from 'class-validator';
import { toInteger } from '../../../common/transformers/transform.helpers';
import { CarouselFiltersDto } from './carousel-filters.dto';

/**
 * Xem trước bộ lọc ĐANG SOẠN trong form, chưa lưu — vì vậy nhận `filters` trong
 * body chứ không đọc từ carousel đã tồn tại.
 */
export class PreviewCarouselDto {
    @ApiProperty({
        type: CarouselFiltersDto,
        description: '`{}` = xem toàn bộ sản phẩm hiển thị được',
    })
    @ValidateNested()
    @Type(() => CarouselFiltersDto)
    @IsObject()
    filters: CarouselFiltersDto;

    @ApiPropertyOptional({ default: 1, minimum: 1 })
    @Transform(toInteger)
    @IsInt()
    @Min(1)
    @IsOptional()
    page: number = 1;

    @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
    @Transform(toInteger)
    @IsInt()
    @Min(1)
    @Max(100)
    @IsOptional()
    limit: number = 20;
}
