import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Put,
    Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LogActivity } from '../../common/decorators/activity-log.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PaginatedResult } from '../../common/dto/paginated-result.dto';
import { PermissionCode } from '../../common/enums/permission.enum';
import { ActivityAction } from '../activity-logs/enums/activity-action.enum';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleOptionDto } from './dto/option.dto';
import { QueryRoleDto } from './dto/query-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './entities/role.entity';
import { RolesService } from './roles.service';

@ApiTags('RBAC - Roles')
@ApiBearerAuth()
@Controller('roles')
@RequirePermissions(PermissionCode.USER_ROLE_MANAGE)
export class RolesController {
    constructor(private readonly rolesService: RolesService) {}

    @Get()
    @ApiOperation({ summary: 'Danh sách vai trò kèm permission đang gán' })
    findAll(@Query() query: QueryRoleDto): Promise<PaginatedResult<Role>> {
        return this.rolesService.findAll(query);
    }

    @Get('options')
    @ApiOperation({
        summary: 'Danh sách vai trò rút gọn cho dropdown',
        description:
            'Không phân trang, chỉ id/code/name/isSystem — dùng cho màn gán vai trò cho user.',
    })
    @ApiResponse({ status: HttpStatus.OK, type: RoleOptionDto, isArray: true })
    findOptions(): Promise<RoleOptionDto[]> {
        return this.rolesService.findOptions();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Chi tiết vai trò kèm danh sách permission' })
    findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Role> {
        return this.rolesService.findOne(id);
    }

    @Post()
    @LogActivity({ action: ActivityAction.CREATE, resource: 'role' })
    @ApiOperation({ summary: 'Tạo vai trò mới, gán luôn permission nếu truyền permissionIds' })
    create(@Body() dto: CreateRoleDto): Promise<Role> {
        return this.rolesService.create(dto);
    }

    @Patch(':id')
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'role' })
    @ApiOperation({ summary: 'Cập nhật vai trò (không đổi được code)' })
    update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoleDto): Promise<Role> {
        return this.rolesService.update(id, dto);
    }

    @Put(':id/permissions')
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'role_permissions' })
    @ApiOperation({
        summary: 'Gán permission cho vai trò',
        description:
            'Ghi đè toàn bộ: danh sách gửi lên là trạng thái cuối cùng. Có hiệu lực ngay với mọi user thuộc vai trò này, không cần đăng nhập lại.',
    })
    setPermissions(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: AssignPermissionsDto,
    ): Promise<Role> {
        return this.rolesService.setPermissions(id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @LogActivity({ action: ActivityAction.DELETE, resource: 'role' })
    @ApiOperation({
        summary: 'Xoá mềm vai trò',
        description: 'Chặn xoá vai trò hệ thống và vai trò còn user đang dùng.',
    })
    remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.rolesService.remove(id);
    }
}
