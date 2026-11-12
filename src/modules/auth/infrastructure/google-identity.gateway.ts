import {
    Injectable,
    Logger,
    ServiceUnavailableException,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

export interface GoogleIdentity {
    /** `sub` — id cố định của tài khoản Google, không đổi kể cả khi đổi email. */
    googleId: string;
    email: string;
    emailVerified: boolean;
    fullName: string;
    avatarUrl: string | null;
}

/**
 * Xác minh ID token do Google Identity Services cấp cho storefront — chỗ duy
 * nhất import `google-auth-library`. Thư viện tự kiểm chữ ký (khoá công khai
 * của Google, có cache), `iss`, hạn dùng và `aud` phải đúng Client ID của mình:
 * thiếu bước `aud`, token cấp cho một app khác cũng sẽ đăng nhập được ở đây.
 */
@Injectable()
export class GoogleIdentityGateway {
    private readonly logger = new Logger(GoogleIdentityGateway.name);
    private readonly clientId: string;
    private readonly client = new OAuth2Client();

    constructor(configService: ConfigService) {
        this.clientId = configService.get<string>('auth.googleClientId', '');
        if (!this.clientId) {
            this.logger.warn('Thiếu GOOGLE_CLIENT_ID — đăng nhập Google sẽ trả 503');
        }
    }

    async verify(idToken: string): Promise<GoogleIdentity> {
        if (!this.clientId) {
            throw new ServiceUnavailableException('Đăng nhập bằng Google chưa được bật');
        }

        let payload;
        try {
            const ticket = await this.client.verifyIdToken({ idToken, audience: this.clientId });
            payload = ticket.getPayload();
        } catch (error) {
            this.logger.warn(`ID token Google không hợp lệ: ${String(error)}`);
            throw new UnauthorizedException(
                'Phiên đăng nhập Google không hợp lệ, vui lòng thử lại',
            );
        }

        if (!payload?.sub || !payload.email) {
            throw new UnauthorizedException('Tài khoản Google không cung cấp email');
        }

        return {
            googleId: payload.sub,
            email: payload.email.toLowerCase(),
            emailVerified: payload.email_verified === true,
            fullName: payload.name?.trim() || payload.email.split('@')[0],
            avatarUrl: payload.picture ?? null,
        };
    }
}
