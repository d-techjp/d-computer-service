import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { toInteger, toTrimmed, toUpperCase } from '../transformers/transform.helpers';

export enum SortOrder {
    ASC = 'ASC',
    DESC = 'DESC',
}

export class PaginationQueryDto {
    @ApiPropertyOptional({ default: 1, minimum: 1, description: 'Trang hiện tại (bắt đầu từ 1)' })
    @Transform(toInteger)
    @IsInt()
    @Min(1)
    @IsOptional()
    page: number = 1;

    @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100, description: 'Số bản ghi/trang' })
    @Transform(toInteger)
    @IsInt()
    @Min(1)
    @Max(100)
    @IsOptional()
    limit: number = 20;

    @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm' })
    @Transform(toTrimmed)
    @IsString()
    @MaxLength(255)
    @IsOptional()
    search?: string;

    @ApiPropertyOptional({ description: 'Cột sắp xếp', default: 'createdAt' })
    @IsString()
    @MaxLength(50)
    @IsOptional()
    sortBy: string = 'createdAt';

    @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
    @Transform(toUpperCase)
    @IsEnum(SortOrder)
    @IsOptional()
    sortOrder: SortOrder = SortOrder.DESC;

    get skip(): number {
        return (this.page - 1) * this.limit;
    }
}
