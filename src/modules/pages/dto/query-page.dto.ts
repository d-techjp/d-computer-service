import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PageStatus } from '../entities/page.entity';

/** Chỉ admin dùng — storefront đọc từng trang theo slug, không có danh sách. */
export class QueryPageDto extends PaginationQueryDto {
    @ApiPropertyOptional({ enum: PageStatus })
    @IsEnum(PageStatus)
    @IsOptional()
    status?: PageStatus;
}
