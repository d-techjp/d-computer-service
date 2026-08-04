import { ApiProperty } from '@nestjs/swagger';
import { Permission } from '../../../common/enums/permission.enum';
import { Role } from '../../../common/enums/role.enum';

export class PermissionsResponseDto {
    @ApiProperty({ enum: Role })
    role: Role;

    @ApiProperty({ enum: Permission, isArray: true })
    permissions: Permission[];
}
