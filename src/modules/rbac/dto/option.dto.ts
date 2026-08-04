import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Bản rút gọn cho dropdown/checkbox — không kèm timestamps, description. */
export class PermissionOptionDto {
    @ApiProperty({ format: 'uuid' }) id: string;
    @ApiProperty({ example: 'product.manage' }) code: string;
    @ApiProperty({ example: 'Quản lý sản phẩm' }) name: string;
}

/** Permission gom theo module để render select có nhóm / cây checkbox. */
export class PermissionGroupOptionDto {
    @ApiProperty({ example: 'product' }) module: string;

    @ApiProperty({ type: PermissionOptionDto, isArray: true })
    permissions: PermissionOptionDto[];
}

export class RoleOptionDto {
    @ApiProperty({ format: 'uuid' }) id: string;
    @ApiProperty({ example: 'staff' }) code: string;
    @ApiProperty({ example: 'Nhân viên' }) name: string;
    @ApiPropertyOptional({ description: 'Role hệ thống thì không xoá được' }) isSystem: boolean;
}
