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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LogActivity } from '../../common/decorators/activity-log.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PaginatedResult } from '../../common/dto/paginated-result.dto';
import { PermissionCode } from '../../common/enums/permission.enum';
import { ActivityAction } from '../activity-logs/enums/activity-action.enum';
import { AssignRoleDto } from '../rbac/dto/assign-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
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

    @Get('me')
    @ApiOperation({ summary: 'Thông tin tài khoản đang đăng nhập' })
    getProfile(@CurrentUser('id') userId: string): Promise<User> {
        return this.usersService.findOne(userId);
    }

    @Patch('me')
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'user' })
    @ApiOperation({ summary: 'Cập nhật hồ sơ của chính mình' })
    updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateUserDto): Promise<User> {
        // Không cho tự đổi trạng thái tài khoản (vai trò đã bị loại khỏi UpdateUserDto)
        const { status: _status, ...safe } = dto;
        return this.usersService.update(userId, safe);
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
    @ApiOperation({ summary: 'Cập nhật user (admin)' })
    update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto): Promise<User> {
        return this.usersService.update(id, dto);
    }

    @Put(':id/role')
    @RequirePermissions(PermissionCode.USER_ROLE_MANAGE)
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'user_role' })
    @ApiOperation({
        summary: 'Gán vai trò cho user',
        description:
            'Chọn `roleCode` từ `GET /roles/options`. Token đang cầm bị thu hồi (role nằm trong JWT) nên user phải đăng nhập lại — hạ quyền có hiệu lực ngay lập tức.',
    })
    assignRole(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignRoleDto): Promise<User> {
        return this.usersService.assignRole(id, dto.roleCode);
    }

    @Delete(':id')
    @RequirePermissions(PermissionCode.USER_ADMINISTRATOR_MANAGE)
    @HttpCode(HttpStatus.NO_CONTENT)
    @LogActivity({ action: ActivityAction.DELETE, resource: 'user' })
    @ApiOperation({ summary: 'Xoá mềm user (admin)' })
    remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.usersService.remove(id);
    }
}
