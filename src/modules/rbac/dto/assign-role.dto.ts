import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { toLowerTrimmed } from '../../../common/transformers/transform.helpers';

export class AssignRoleDto {
    @ApiProperty({ example: 'staff', description: 'Code vai trò gán cho user' })
    @Transform(toLowerTrimmed)
    @IsString()
    @MinLength(2)
    @MaxLength(50)
    roleCode: string;
}
