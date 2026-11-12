import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type {
    AuthenticatedUser,
    JwtPayload,
} from '../../../common/interfaces/authenticated-user.interface';
import { AuthService } from '../application/auth.service';
import { extractTokenFromCookie } from '../infrastructure/auth-cookie';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        configService: ConfigService,
        private readonly authService: AuthService,
    ) {
        super({
            // Header trước (trang quản trị, công cụ), rồi cookie phiên của storefront
            jwtFromRequest: ExtractJwt.fromExtractors([
                ExtractJwt.fromAuthHeaderAsBearerToken(),
                extractTokenFromCookie,
            ]),
            ignoreExpiration: false,
            secretOrKey: configService.getOrThrow<string>('jwt.secret'),
            issuer: 'd-computer-service',
        });
    }

    /** Chạy sau khi chữ ký + hạn dùng đã hợp lệ. */
    async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
        if (!payload?.sub || typeof payload.ver !== 'number') {
            throw new UnauthorizedException('Token không hợp lệ');
        }

        await this.authService.verifyTokenVersion(payload);

        return {
            id: payload.sub,
            username: payload.username,
            email: payload.email,
            role: payload.role,
            tokenVersion: payload.ver,
        };
    }
}
