import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { toInteger } from '../../../common/transformers/transform.helpers';

export class QueryInventoryStockDto extends PaginationQueryDto {
    @ApiPropertyOptional({ description: 'Tồn kho tối thiểu' })
    @Transform(toInteger)
    @IsInt()
    @Min(0)
    @IsOptional()
    minStock?: number;

    @ApiPropertyOptional({ description: 'Tồn kho tối đa' })
    @Transform(toInteger)
    @IsInt()
    @Min(0)
    @IsOptional()
    maxStock?: number;
}
