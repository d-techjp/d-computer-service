import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/application/users.service';
import { AuthService } from '../application/auth.service';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { LoginDto } from '../dto/login.dto';
import { PermissionsResponseDto } from '../dto/permissions-response.dto';
import { RegisterDto } from '../dto/register.dto';

@ApiTags('Auth')
@Controller('auth')
export class ClientAuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly usersService: UsersService,
    ) {}

    @Public()
    @Post('register')
    @ApiOperation({ summary: 'Đăng ký tài khoản khách hàng' })
    @ApiResponse({ status: HttpStatus.CREATED, type: AuthResponseDto })
    register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
        return this.authService.register(dto);
    }

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Đăng nhập, trả về JWT access token',
        description:
            'Mỗi lần đăng nhập token version tăng 1, nên token được cấp trước đó sẽ mất hiệu lực.',
    })
    @ApiResponse({ status: HttpStatus.OK, type: AuthResponseDto })
    login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
        return this.authService.login(dto);
    }

    @ApiBearerAuth()
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Đăng xuất',
        description: 'Tăng token version lên 1 khiến token đang dùng không còn hợp lệ.',
    })
    logout(@CurrentUser() user: AuthenticatedUser): Promise<{ tokenVersion: number }> {
        return this.authService.logout(user.id, user.email);
    }

    @ApiBearerAuth()
    @Post('logout-all')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Thu hồi toàn bộ token của tài khoản',
        description: 'Xoá bản ghi version trong store — mọi token đã cấp đều bị từ chối.',
    })
    logoutAll(@CurrentUser() user: AuthenticatedUser): Promise<void> {
        return this.authService.logoutAll(user.id, user.email);
    }

    @ApiBearerAuth()
    @Post('change-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Đổi mật khẩu',
        description: 'Trả về token mới; token cũ mất hiệu lực do version đã tăng.',
    })
    @ApiResponse({ status: HttpStatus.OK, type: AuthResponseDto })
    changePassword(
        @CurrentUser('id') userId: string,
        @Body() dto: ChangePasswordDto,
    ): Promise<AuthResponseDto> {
        return this.authService.changePassword(userId, dto);
    }

    @ApiBearerAuth()
    @Get('profile')
    @ApiOperation({ summary: 'Thông tin tài khoản đang đăng nhập' })
    profile(@CurrentUser('id') userId: string): Promise<User> {
        return this.usersService.findOne(userId);
    }

    @ApiBearerAuth()
    @Get('permissions')
    @ApiOperation({
        summary: 'Permission của tài khoản đang đăng nhập',
        description:
            'Verify access token rồi trả permission theo role — client lưu vào storage để quyết định hiển thị UI.',
    })
    @ApiResponse({ status: HttpStatus.OK, type: PermissionsResponseDto })
    async getPermissions(@CurrentUser() user: AuthenticatedUser): Promise<PermissionsResponseDto> {
        return {
            role: user.role,
            permissions: await this.authService.getPermissions(user.role),
        };
    }
}
