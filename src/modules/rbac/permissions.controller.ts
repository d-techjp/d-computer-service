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
    Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LogActivity } from '../../common/decorators/activity-log.decorator';
import { AdminController } from '../../common/decorators/admin-controller.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PaginatedResult } from '../../common/dto/paginated-result.dto';
import { PermissionCode } from '../../common/enums/permission.enum';
import { ActivityAction } from '../activity-logs/enums/activity-action.enum';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { PermissionGroupOptionDto } from './dto/option.dto';
import { QueryPermissionDto } from './dto/query-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { Permission } from './entities/permission.entity';
import { PermissionsService } from './permissions.service';

@AdminController('permissions', 'RBAC - Permissions')
@RequirePermissions(PermissionCode.USER_ROLE_MANAGE)
export class PermissionsController {
    constructor(private readonly permissionsService: PermissionsService) {}

    @Get()
    @ApiOperation({ summary: 'Danh sách permission có phân trang / lọc theo module' })
    findAll(@Query() query: QueryPermissionDto): Promise<PaginatedResult<Permission>> {
        return this.permissionsService.findAll(query);
    }

    @Get('options')
    @ApiOperation({
        summary: 'Danh sách permission rút gọn cho dropdown',
        description:
            'Không phân trang, chỉ trả id/code/name và gom sẵn theo module — dùng cho màn gán quyền cho vai trò.',
    })
    @ApiResponse({ status: HttpStatus.OK, type: PermissionGroupOptionDto, isArray: true })
    findOptions(): Promise<PermissionGroupOptionDto[]> {
        return this.permissionsService.findOptions();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Chi tiết permission' })
    findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Permission> {
        return this.permissionsService.findOne(id);
    }

    @Post()
    @LogActivity({ action: ActivityAction.CREATE, resource: 'permission' })
    @ApiOperation({
        summary: 'Tạo permission mới',
        description:
            'Permission tạo qua API chỉ để gán cho role và hiển thị trên UI — chưa có route backend nào tham chiếu tới nó.',
    })
    create(@Body() dto: CreatePermissionDto): Promise<Permission> {
        return this.permissionsService.create(dto);
    }

    @Patch(':id')
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'permission' })
    @ApiOperation({ summary: 'Cập nhật permission (không đổi được code)' })
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdatePermissionDto,
    ): Promise<Permission> {
        return this.permissionsService.update(id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @LogActivity({ action: ActivityAction.DELETE, resource: 'permission' })
    @ApiOperation({ summary: 'Xoá permission, gỡ khỏi mọi vai trò đang gán' })
    remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.permissionsService.remove(id);
    }
}
