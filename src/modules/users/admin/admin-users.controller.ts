import {
    Body,
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
import { ApiOperation } from '@nestjs/swagger';
import { LogActivity } from '../../../common/decorators/activity-log.decorator';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import { PermissionCode } from '../../../common/enums/permission.enum';
import { ActivityAction } from '../../activity-logs/enums/activity-action.enum';
import { AssignRoleDto } from '../../rbac/dto/assign-role.dto';
import { UsersService } from '../application/users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { QueryUserDto } from '../dto/query-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '../entities/user.entity';

@AdminController('users', 'Users')
export class AdminUsersController {
    constructor(private readonly usersService: UsersService) {}

    @Post()
    @RequirePermissions(PermissionCode.USER_ADMINISTRATOR_MANAGE)
    @LogActivity({ action: ActivityAction.CREATE, resource: 'user' })
    @ApiOperation({
        summary: 'Tạo user mới',
        description:
            'Truyền `roleCode` (vd `admin`, `staff`) để tạo tài khoản quản trị; bỏ trống thì mặc định là khách hàng.',
    })
    create(@Body() dto: CreateUserDto): Promise<User> {
        return this.usersService.create(dto);
    }

    @Get()
    @RequirePermissions(
        PermissionCode.USER_CUSTOMER_MANAGE,
        PermissionCode.USER_ADMINISTRATOR_MANAGE,
    )
    @ApiOperation({ summary: 'Danh sách user có phân trang / lọc / tìm kiếm' })
    findAll(@Query() query: QueryUserDto): Promise<PaginatedResult<User>> {
        return this.usersService.findAll(query);
    }

    @Get(':id')
    @RequirePermissions(
        PermissionCode.USER_CUSTOMER_MANAGE,
        PermissionCode.USER_ADMINISTRATOR_MANAGE,
    )
    @ApiOperation({ summary: 'Chi tiết user theo id' })
    findOne(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
        return this.usersService.findOne(id);
    }

    @Patch(':id')
    @RequirePermissions(PermissionCode.USER_ADMINISTRATOR_MANAGE)
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'user' })
    @ApiOperation({ summary: 'Cập nhật user' })
    update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto): Promise<User> {
        return this.usersService.update(id, dto);
    }

    @Put(':id/role')
    @RequirePermissions(PermissionCode.USER_ROLE_MANAGE)
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'user_role' })
    @ApiOperation({
        summary: 'Gán vai trò cho user',
        description:
            'Chọn `roleCode` từ `GET /admin/roles/options`. Token đang cầm bị thu hồi (role nằm trong JWT) nên user phải đăng nhập lại — hạ quyền có hiệu lực ngay lập tức.',
    })
    assignRole(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignRoleDto): Promise<User> {
        return this.usersService.assignRole(id, dto.roleCode);
    }

    @Delete(':id')
    @RequirePermissions(PermissionCode.USER_ADMINISTRATOR_MANAGE)
    @HttpCode(HttpStatus.NO_CONTENT)
    @LogActivity({ action: ActivityAction.DELETE, resource: 'user' })
    @ApiOperation({ summary: 'Xoá mềm user' })
    remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.usersService.remove(id);
    }
}
