import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { Role } from '../../../common/enums/role.enum';
import { UserStatus } from '../entities/user.entity';

export class QueryUserDto extends PaginationQueryDto {
    @ApiPropertyOptional({ enum: Role })
    @IsEnum(Role)
    @IsOptional()
    role?: Role;

    @ApiPropertyOptional({ enum: UserStatus })
    @IsEnum(UserStatus)
    @IsOptional()
    status?: UserStatus;
}
