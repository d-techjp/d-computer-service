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
    Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LogActivity } from '../../common/decorators/activity-log.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedResult } from '../../common/dto/paginated-result.dto';
import { Role } from '../../common/enums/role.enum';
import { ActivityAction } from '../activity-logs/enums/activity-action.enum';
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
    @Roles(Role.ADMIN)
    @LogActivity({ action: ActivityAction.CREATE, resource: 'user' })
    @ApiOperation({ summary: 'Tạo user mới (admin)' })
    create(@Body() dto: CreateUserDto): Promise<User> {
        return this.usersService.create(dto);
    }

    @Get()
    @Roles(Role.ADMIN, Role.STAFF)
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
        // Không cho tự nâng quyền hoặc tự đổi trạng thái tài khoản
        const { role: _role, status: _status, ...safe } = dto;
        return this.usersService.update(userId, safe);
    }

    @Get(':id')
    @Roles(Role.ADMIN, Role.STAFF)
    @ApiOperation({ summary: 'Chi tiết user theo id' })
    findOne(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
        return this.usersService.findOne(id);
    }

    @Patch(':id')
    @Roles(Role.ADMIN)
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'user' })
    @ApiOperation({ summary: 'Cập nhật user (admin)' })
    update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto): Promise<User> {
        return this.usersService.update(id, dto);
    }

    @Delete(':id')
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    @LogActivity({ action: ActivityAction.DELETE, resource: 'user' })
    @ApiOperation({ summary: 'Xoá mềm user (admin)' })
    remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.usersService.remove(id);
    }
}
