import { Body, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { UsersService } from '../../users/application/users.service';
import { User } from '../../users/entities/user.entity';
import { AuthService } from '../application/auth.service';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { LoginDto } from '../dto/login.dto';
import { PermissionsResponseDto } from '../dto/permissions-response.dto';

/**
 * Cổng đăng nhập của trang quản trị. Soi kỹ thì các endpoint sau `login` giống hệt
 * `/auth/*` — chúng tồn tại để FE quản trị dùng đúng MỘT baseURL `/api/v1/admin`,
 * khỏi phải phá lệ riêng cho auth. Token cấp ở đây và ở `/auth/login` là một loại,
 * dùng lẫn được.
 *
 * CỐ Ý không có `register`: tài khoản quản trị chỉ được tạo qua `POST /admin/users`.
 */
@AdminController('auth', 'Auth')
export class AdminAuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly usersService: UsersService,
    ) {}

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Đăng nhập trang quản trị',
        description:
            'Khác `/auth/login` ở chỗ tài khoản không có quyền nào (khách hàng) bị từ chối ' +
            'với 403 và KHÔNG được cấp token. Mỗi lần đăng nhập token version tăng 1 nên ' +
            'token cấp trước đó mất hiệu lực.',
    })
    @ApiResponse({ status: HttpStatus.OK, type: AuthResponseDto })
    login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
        return this.authService.login(dto, { requireAdminAccess: true });
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Đăng xuất',
        description: 'Tăng token version lên 1 khiến token đang dùng không còn hợp lệ.',
    })
    logout(@CurrentUser() user: AuthenticatedUser): Promise<{ tokenVersion: number }> {
        return this.authService.logout(user.id, user.email);
    }

    @Post('logout-all')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Thu hồi toàn bộ token của tài khoản',
        description: 'Xoá bản ghi version trong store — mọi token đã cấp đều bị từ chối.',
    })
    logoutAll(@CurrentUser() user: AuthenticatedUser): Promise<void> {
        return this.authService.logoutAll(user.id, user.email);
    }

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

    @Get('profile')
    @ApiOperation({ summary: 'Thông tin tài khoản đang đăng nhập' })
    profile(@CurrentUser('id') userId: string): Promise<User> {
        return this.usersService.findOne(userId);
    }

    @Get('permissions')
    @ApiOperation({
        summary: 'Permission của tài khoản đang đăng nhập',
        description: 'FE quản trị lưu lại để quyết định hiển thị menu / nút thao tác.',
    })
    @ApiResponse({ status: HttpStatus.OK, type: PermissionsResponseDto })
    async getPermissions(@CurrentUser() user: AuthenticatedUser): Promise<PermissionsResponseDto> {
        return {
            role: user.role,
            permissions: await this.authService.getPermissions(user.role),
        };
    }
}
