import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type {
    AuthenticatedUser,
    JwtPayload,
} from '../../../common/interfaces/authenticated-user.interface';
import { AuthService } from '../application/auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        configService: ConfigService,
        private readonly authService: AuthService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
