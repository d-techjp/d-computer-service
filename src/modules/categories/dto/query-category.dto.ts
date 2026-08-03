import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { toBoolean } from '../../../common/transformers/transform.helpers';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryCategoryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ format: 'uuid', description: 'Lọc theo danh mục cha' })
    @IsUUID()
    @IsOptional()
    parentId?: string;

    @ApiPropertyOptional({ description: 'true = chỉ lấy danh mục gốc (parentId IS NULL)' })
    @Transform(toBoolean)
    @IsBoolean()
    @IsOptional()
    rootOnly?: boolean;

    @ApiPropertyOptional()
    @Transform(toBoolean)
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
