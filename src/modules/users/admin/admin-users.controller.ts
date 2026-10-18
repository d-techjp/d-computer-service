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
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { LogActivity } from '../../../common/decorators/activity-log.decorator';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import { PermissionCode } from '../../../common/enums/permission.enum';
import { ActivityAction } from '../../activity-logs/enums/activity-action.enum';
import { OrdersService } from '../../orders/application/orders.service';
import { AssignRoleDto } from '../../rbac/dto/assign-role.dto';
import { UsersService } from '../application/users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { QueryUserDto } from '../dto/query-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '../entities/user.entity';
import { CustomerOrderStatsDto } from './dto/customer-order-stats.dto';

@AdminController('users', 'Users')
export class AdminUsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly ordersService: OrdersService,
    ) {}

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

    @Get(':id/order-stats')
    @RequirePermissions(PermissionCode.USER_CUSTOMER_MANAGE)
    @ApiOkResponse({ type: CustomerOrderStatsDto })
    @ApiOperation({
        summary: 'Số liệu mua hàng của khách — tính khi mở chi tiết',
        description: 'Chi tiêu chỉ tính đơn hoàn tất, cùng quy ước với dashboard',
    })
    async orderStats(@Param('id', ParseUUIDPipe) id: string): Promise<CustomerOrderStatsDto> {
        await this.usersService.findOne(id);
        const stats = await this.ordersService.customerStats(id);
        return {
            ...stats,
            averageOrderValue:
                stats.completedCount > 0 ? Math.round(stats.totalSpent / stats.completedCount) : 0,
        };
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
