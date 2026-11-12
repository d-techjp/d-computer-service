import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../../../common/guards/optional-jwt-auth.guard';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/application/users.service';
import { AuthService } from '../application/auth.service';
import { GoogleAuthService } from '../application/google-auth.service';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { PermissionsResponseDto } from '../dto/permissions-response.dto';
import { TurnstileGuard } from '../guards/turnstile.guard';
import { AuthCookie } from '../infrastructure/auth-cookie';
import { ClientLoginDto } from './dto/client-login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Auth')
@Controller('auth')
export class ClientAuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly googleAuthService: GoogleAuthService,
        private readonly usersService: UsersService,
        private readonly authCookie: AuthCookie,
    ) {}

    @Public()
    @UseGuards(TurnstileGuard)
    @Post('register')
    @ApiOperation({
        summary: 'Đăng ký tài khoản khách hàng',
        description: 'Bắt buộc `captchaToken` (Cloudflare Turnstile). Username do server sinh.',
    })
    @ApiResponse({ status: HttpStatus.CREATED, type: AuthResponseDto })
    register(
        @Body() dto: RegisterDto,
        @Res({ passthrough: true }) res: Response,
    ): Promise<AuthResponseDto> {
        const { captchaToken: _captchaToken, ...input } = dto;
        return this.withSessionCookie(res, this.authService.register(input));
    }

    @Public()
    @UseGuards(TurnstileGuard)
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Đăng nhập bằng username hoặc email, trả về JWT access token',
        description:
            'Bắt buộc `captchaToken`. Mỗi lần đăng nhập token version tăng 1, nên token được cấp trước đó sẽ mất hiệu lực.',
    })
    @ApiResponse({ status: HttpStatus.OK, type: AuthResponseDto })
    login(
        @Body() dto: ClientLoginDto,
        @Res({ passthrough: true }) res: Response,
    ): Promise<AuthResponseDto> {
        const auth = this.authService.login({ username: dto.username, password: dto.password });
        return this.withSessionCookie(res, auth);
    }

    @Public()
    @UseGuards(TurnstileGuard)
    @Post('google')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Đăng nhập / đăng ký bằng Google',
        description:
            'Nhận ID token từ Google Identity Services. Chưa có tài khoản thì tạo mới; trùng email với tài khoản khách sẵn có thì liên kết (mật khẩu cũ bị vô hiệu).',
    })
    @ApiResponse({ status: HttpStatus.OK, type: AuthResponseDto })
    loginWithGoogle(
        @Body() dto: GoogleLoginDto,
        @Res({ passthrough: true }) res: Response,
    ): Promise<AuthResponseDto> {
        return this.withSessionCookie(res, this.googleAuthService.login(dto.idToken));
    }

    @Public()
    @UseGuards(OptionalJwtAuthGuard)
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Đăng xuất',
        description:
            'Tăng token version (token đang dùng mất hiệu lực) và xoá cookie phiên. Token đã hết hạn vẫn gọi được để dọn cookie.',
    })
    async logout(
        @CurrentUser() user: AuthenticatedUser | undefined,
        @Res({ passthrough: true }) res: Response,
    ): Promise<{ tokenVersion: number | null }> {
        this.authCookie.clear(res);
        if (!user) return { tokenVersion: null };
        return this.authService.logout(user.id, user.email);
    }

    @ApiBearerAuth()
    @Post('logout-all')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Thu hồi toàn bộ token của tài khoản',
        description: 'Xoá bản ghi version trong store — mọi token đã cấp đều bị từ chối.',
    })
    logoutAll(
        @CurrentUser() user: AuthenticatedUser,
        @Res({ passthrough: true }) res: Response,
    ): Promise<void> {
        this.authCookie.clear(res);
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
        @Res({ passthrough: true }) res: Response,
    ): Promise<AuthResponseDto> {
        // Token cũ chết ngay khi đổi mật khẩu, nên cookie phải mang token mới
        return this.withSessionCookie(res, this.authService.changePassword(userId, dto));
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

    /** Ghi token vừa cấp vào cookie phiên storefront; body giữ nguyên cho client dùng header. */
    private async withSessionCookie(
        res: Response,
        pending: Promise<AuthResponseDto>,
    ): Promise<AuthResponseDto> {
        const auth = await pending;
        this.authCookie.set(res, auth.accessToken, auth.expiresIn);
        return auth;
    }
}
