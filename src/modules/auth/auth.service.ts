import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type {
    JwtExpiresIn,
    JwtPayload,
} from '../../common/interfaces/authenticated-user.interface';
import { parseDurationToSeconds } from '../../common/utils/duration.util';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { ActivityAction, ActivityStatus } from '../activity-logs/enums/activity-action.enum';
import { UserPermissionsService } from '../rbac/user-permissions.service';
import { User, UserStatus } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import type { AuthResponseDto } from './dto/auth-response.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import { TokenVersionStore } from './token-version/token-version.store';

@Injectable()
export class AuthService {
    private readonly expiresIn: JwtExpiresIn;
    private readonly expiresInSeconds: number;
    private readonly issuer: string;

    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly tokenVersionStore: TokenVersionStore,
        private readonly activityLogsService: ActivityLogsService,
        private readonly userPermissionsService: UserPermissionsService,
        configService: ConfigService,
    ) {
        this.expiresIn = configService.get<string>('jwt.expiresIn', '1d') as JwtExpiresIn;
        this.expiresInSeconds = parseDurationToSeconds(String(this.expiresIn), 86400);
        this.issuer = 'd-computer-service';
    }

    async register(dto: RegisterDto): Promise<AuthResponseDto> {
        // RegisterDto đã bỏ roleCode -> UsersService tự gán vai trò khách hàng
        const user = await this.usersService.create(dto);

        await this.activityLogsService.record({
            userId: user.id,
            email: user.email,
            action: ActivityAction.REGISTER,
            resource: 'auth',
            resourceId: user.id,
        });

        return this.issueToken(user);
    }

    async login(dto: LoginDto): Promise<AuthResponseDto> {
        const user = await this.usersService.findByUsernameWithPassword(dto.username);

        // So khớp password kể cả khi không tìm thấy user cũng không đổi luồng:
        // thông báo lỗi giữ nguyên để tránh lộ username nào đã tồn tại.
        const passwordMatched = user
            ? await this.usersService.comparePassword(dto.password, user.password)
            : false;

        if (!user || !passwordMatched) {
            await this.activityLogsService.record({
                userId: user?.id ?? null,
                email: user?.email ?? null,
                action: ActivityAction.LOGIN_FAILED,
                resource: 'auth',
                status: ActivityStatus.FAILED,
                description: 'Tên đăng nhập hoặc mật khẩu không đúng',
            });
            throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng');
        }

        this.assertUsable(user);

        const auth = await this.issueToken(user);
        await this.usersService.markLoggedIn(user.id);
        await this.activityLogsService.record({
            userId: user.id,
            email: user.email,
            action: ActivityAction.LOGIN,
            resource: 'auth',
            resourceId: user.id,
            metadata: {},
        });

        return auth;
    }

    /** Tăng version -> token đang cầm lập tức hết hiệu lực. */
    async logout(userId: string, email: string | null): Promise<{ tokenVersion: number }> {
        const tokenVersion = await this.tokenVersionStore.increment(userId);

        await this.activityLogsService.record({
            userId,
            email,
            action: ActivityAction.LOGOUT,
            resource: 'auth',
            resourceId: userId,
            metadata: { tokenVersion },
        });

        return { tokenVersion };
    }

    /** Xoá hẳn bản ghi version -> mọi token của user đều bị từ chối. */
    async logoutAll(userId: string, email: string | null): Promise<void> {
        await this.tokenVersionStore.revoke(userId);
        await this.activityLogsService.record({
            userId,
            email,
            action: ActivityAction.LOGOUT_ALL,
            resource: 'auth',
            resourceId: userId,
        });
    }

    async changePassword(userId: string, dto: ChangePasswordDto): Promise<AuthResponseDto> {
        const user = await this.usersService.findOne(userId);
        const withPassword = await this.usersService.findByIdWithPassword(userId);

        const matched =
            withPassword &&
            (await this.usersService.comparePassword(dto.currentPassword, withPassword.password));
        if (!matched) throw new UnauthorizedException('Mật khẩu hiện tại không đúng');

        await this.usersService.updatePassword(
            userId,
            await this.usersService.hashPassword(dto.newPassword),
        );

        await this.activityLogsService.record({
            userId,
            email: user.email,
            action: ActivityAction.CHANGE_PASSWORD,
            resource: 'auth',
            resourceId: userId,
        });

        // Cấp token mới (version tăng) — token cũ hết hiệu lực ngay sau khi đổi mật khẩu
        return this.issueToken(user);
    }

    /**
     * Được JwtStrategy gọi sau khi chữ ký hợp lệ: đối chiếu `ver` trong token
     * với version đang lưu trong store.
     */
    async verifyTokenVersion(payload: JwtPayload): Promise<void> {
        const currentVersion = await this.tokenVersionStore.get(payload.sub);

        if (currentVersion === null) {
            throw new UnauthorizedException('Phiên đăng nhập đã kết thúc, vui lòng đăng nhập lại');
        }
        if (currentVersion !== payload.ver) {
            throw new UnauthorizedException('Token đã bị thu hồi, vui lòng đăng nhập lại');
        }
    }

    /**
     * Permission của user, đọc từ bảng `role_permissions` (cache Redis theo role).
     * Client lưu vào storage để quyết định hiển thị UI.
     */
    getPermissions(roleCode: string): Promise<string[]> {
        return this.userPermissionsService.getByRoleCode(roleCode);
    }

    private async issueToken(user: User): Promise<AuthResponseDto> {
        const tokenVersion = await this.tokenVersionStore.increment(user.id);

        const payload: JwtPayload = {
            sub: user.id,
            username: user.username,
            email: user.email,
            role: user.role.code,
            ver: tokenVersion,
        };

        const accessToken = await this.jwtService.signAsync(payload, {
            expiresIn: this.expiresIn,
            issuer: this.issuer,
        });

        return {
            accessToken,
            tokenType: 'Bearer',
            expiresIn: this.expiresInSeconds,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                role: user.role.code,
            },
        };
    }

    private assertUsable(user: User): void {
        if (user.status === UserStatus.BANNED) {
            throw new UnauthorizedException('Tài khoản đã bị khoá');
        }
        if (user.status !== UserStatus.ACTIVE) {
            throw new UnauthorizedException('Tài khoản chưa được kích hoạt');
        }
    }
}
