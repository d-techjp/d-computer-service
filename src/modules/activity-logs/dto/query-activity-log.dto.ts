import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ActivityStatus } from '../enums/activity-action.enum';

export class QueryActivityLogDto extends PaginationQueryDto {
    @ApiPropertyOptional({ format: 'uuid' })
    @IsUUID()
    @IsOptional()
    userId?: string;

    @ApiPropertyOptional({ example: 'login' })
    @IsString()
    @MaxLength(64)
    @IsOptional()
    action?: string;

    @ApiPropertyOptional({ example: 'product' })
    @IsString()
    @MaxLength(64)
    @IsOptional()
    resource?: string;

    @ApiPropertyOptional()
    @IsString()
    @MaxLength(64)
    @IsOptional()
    resourceId?: string;

    @ApiPropertyOptional({ enum: ActivityStatus })
    @IsEnum(ActivityStatus)
    @IsOptional()
    status?: ActivityStatus;

    @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
    @IsDateString()
    @IsOptional()
    from?: string;

    @ApiPropertyOptional({ example: '2026-12-31T23:59:59.999Z' })
    @IsDateString()
    @IsOptional()
    to?: string;
}
