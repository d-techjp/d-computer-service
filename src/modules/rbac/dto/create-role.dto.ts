import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    ArrayUnique,
    IsArray,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';
import { toLowerTrimmed, toTrimmed } from '../../../common/transformers/transform.helpers';

export const ROLE_CODE_RULE = /^[a-z0-9_-]+$/;
export const ROLE_CODE_MESSAGE = 'Code chỉ gồm chữ thường, số, gạch ngang và gạch dưới';

export class CreateRoleDto {
    @ApiProperty({
        example: 'content-editor',
        description: 'Định danh role, không đổi được sau khi tạo',
    })
    @Transform(toLowerTrimmed)
    @IsString()
    @Matches(ROLE_CODE_RULE, { message: ROLE_CODE_MESSAGE })
    @MinLength(2)
    @MaxLength(50)
    code: string;

    @ApiProperty({ example: 'Biên tập viên' })
    @Transform(toTrimmed)
    @IsString()
    @MinLength(2)
    @MaxLength(150)
    name: string;

    @ApiPropertyOptional({ example: 'Chỉ quản lý bài viết' })
    @Transform(toTrimmed)
    @IsString()
    @MaxLength(500)
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({
        type: String,
        isArray: true,
        example: ['articles.manage'],
        description: 'Code permission gán cho role — bỏ trống là role chưa có quyền nào',
    })
    @IsArray()
    @ArrayUnique()
    @IsString({ each: true })
    @MaxLength(100, { each: true })
    @IsOptional()
    permissionCodes?: string[];
}
