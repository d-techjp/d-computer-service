import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { toLowerTrimmed } from '../../../common/transformers/transform.helpers';

export class QueryPermissionDto extends PaginationQueryDto {
    @ApiPropertyOptional({ example: 'product', description: 'Lọc theo nhóm module' })
    @Transform(toLowerTrimmed)
    @IsString()
    @MaxLength(50)
    @IsOptional()
    module?: string;
}
