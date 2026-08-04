import { ApiProperty } from '@nestjs/swagger';

export class PermissionsResponseDto {
    @ApiProperty({ example: 'admin', description: 'Code vai trò đang gán' })
    role: string;

    @ApiProperty({
        type: String,
        isArray: true,
        example: ['dashboard.view', 'product.manage'],
        description: 'Code các permission của vai trò — client lưu vào storage',
    })
    permissions: string[];
}
