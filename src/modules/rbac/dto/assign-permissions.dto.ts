import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsString, MaxLength } from 'class-validator';

export class AssignPermissionsDto {
    @ApiProperty({
        type: String,
        isArray: true,
        example: ['product.manage', 'articles.manage'],
        description: 'Code permission SAU khi cập nhật — gửi mảng rỗng để gỡ hết quyền',
    })
    @IsArray()
    @ArrayUnique()
    @IsString({ each: true })
    @MaxLength(100, { each: true })
    permissionCodes: string[];
}
