import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { toBoolean } from '../../../common/transformers/transform.helpers';

export class QueryRoleDto extends PaginationQueryDto {
    @ApiPropertyOptional({ description: 'Lọc role hệ thống (admin/staff/customer)' })
    @Transform(toBoolean)
    @IsBoolean()
    @IsOptional()
    isSystem?: boolean;
}
