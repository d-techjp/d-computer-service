import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { toBoolean } from '../../../common/transformers/transform.helpers';

export class QueryBrandDto extends PaginationQueryDto {
    @ApiPropertyOptional()
    @Transform(toBoolean)
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @ApiPropertyOptional({ example: 'US' })
    @IsString()
    @MaxLength(100)
    @IsOptional()
    country?: string;
}
