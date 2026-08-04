import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { toLowerTrimmed } from '../../../common/transformers/transform.helpers';
import { UserStatus } from '../entities/user.entity';

export class QueryUserDto extends PaginationQueryDto {
    @ApiPropertyOptional({ example: 'staff', description: 'Lọc theo code vai trò' })
    @Transform(toLowerTrimmed)
    @IsString()
    @MaxLength(50)
    @IsOptional()
    roleCode?: string;

    @ApiPropertyOptional({ enum: UserStatus })
    @IsEnum(UserStatus)
    @IsOptional()
    status?: UserStatus;
}
