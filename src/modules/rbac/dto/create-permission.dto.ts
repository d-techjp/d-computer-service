import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { toLowerTrimmed, toTrimmed } from '../../../common/transformers/transform.helpers';

export const PERMISSION_CODE_RULE = /^[a-z0-9]+(\.[a-z0-9-]+)+$/;
export const PERMISSION_CODE_MESSAGE =
    'Code phải theo dạng `module.action`, ví dụ `product.manage` (chữ thường, phân tách bằng dấu chấm)';

export class CreatePermissionDto {
    @ApiProperty({ example: 'report.export' })
    @Transform(toLowerTrimmed)
    @IsString()
    @Matches(PERMISSION_CODE_RULE, { message: PERMISSION_CODE_MESSAGE })
    @MaxLength(100)
    code: string;

    @ApiProperty({ example: 'Xuất báo cáo' })
    @Transform(toTrimmed)
    @IsString()
    @MinLength(2)
    @MaxLength(150)
    name: string;

    @ApiProperty({ example: 'report', description: 'Nhóm hiển thị trên admin UI' })
    @Transform(toLowerTrimmed)
    @IsString()
    @MinLength(2)
    @MaxLength(50)
    module: string;

    @ApiPropertyOptional()
    @Transform(toTrimmed)
    @IsString()
    @MaxLength(500)
    @IsOptional()
    description?: string;
}
