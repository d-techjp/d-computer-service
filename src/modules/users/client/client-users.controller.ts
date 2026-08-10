import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LogActivity } from '../../../common/decorators/activity-log.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ActivityAction } from '../../activity-logs/enums/activity-action.enum';
import { UsersService } from '../application/users.service';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '../entities/user.entity';

/**
 * Chỉ thao tác trên chính tài khoản đang đăng nhập. Giữ nguyên đường dẫn
 * `/users/me` để FE storefront không phải sửa; mọi endpoint đụng tới user khác
 * đã chuyển sang `/admin/users`.
 */
@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class ClientUsersController {
    constructor(private readonly usersService: UsersService) {}

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
}
