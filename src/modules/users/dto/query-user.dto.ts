import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { toLowerTrimmedArray } from '../../../common/transformers/transform.helpers';
import { UserStatus } from '../entities/user.entity';

export class QueryUserDto extends PaginationQueryDto {
    @ApiPropertyOptional({
        type: String,
        example: 'staff|admin',
        description: 'Lọc theo code vai trò — nhiều giá trị phân tách bằng `|`, vd `staff|admin`',
    })
    @Transform(toLowerTrimmedArray)
    @IsArray()
    @IsString({ each: true })
    @MaxLength(50, { each: true })
    @ArrayMaxSize(20)
    @IsOptional()
    roleCode?: string[];

    @ApiPropertyOptional({ enum: UserStatus })
    @IsEnum(UserStatus)
    @IsOptional()
    status?: UserStatus;
}
