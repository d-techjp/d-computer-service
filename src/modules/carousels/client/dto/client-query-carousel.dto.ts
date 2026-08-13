import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import { toBoolean, toInteger } from '../../../../common/transformers/transform.helpers';
import { CAROUSEL_MAX_ITEM_LIMIT } from '../../entities/carousel.entity';

export class ClientQueryCarouselDto {
    @ApiPropertyOptional({
        default: false,
        description: 'true = mỗi carousel trả kèm sản phẩm, trang chủ chỉ tốn 1 request',
    })
    @Transform(toBoolean)
    @IsBoolean()
    @IsOptional()
    includeProducts?: boolean;

    @ApiPropertyOptional({
        minimum: 1,
        maximum: CAROUSEL_MAX_ITEM_LIMIT,
        description: 'Ghi đè `itemLimit` của carousel khi `includeProducts=true`',
    })
    @Transform(toInteger)
    @IsInt()
    @Min(1)
    @Max(CAROUSEL_MAX_ITEM_LIMIT)
    @IsOptional()
    productLimit?: number;
}
