import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { toBoolean } from '../../../common/transformers/transform.helpers';

export class QueryCarouselDto extends PaginationQueryDto {
    @ApiPropertyOptional()
    @Transform(toBoolean)
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @ApiPropertyOptional({
        default: false,
        description:
            'true = tính `productCount` cho từng dòng. Mỗi carousel là một truy vấn đếm ' +
            'riêng nên mặc định tắt; khi tắt, `productCount` trả `null`.',
    })
    @Transform(toBoolean)
    @IsBoolean()
    @IsOptional()
    withProductCount?: boolean;
}
