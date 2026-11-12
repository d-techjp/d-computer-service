import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { JwtExpiresIn } from '../../common/interfaces/authenticated-user.interface';
import { RbacModule } from '../rbac/rbac.module';
import { UsersModule } from '../users/users.module';
import { AdminAuthController } from './admin/admin-auth.controller';
import { AuthService } from './application/auth.service';
import { GoogleAuthService } from './application/google-auth.service';
import { ClientAuthController } from './client/client-auth.controller';
import { TurnstileGuard } from './guards/turnstile.guard';
import { AuthCookie } from './infrastructure/auth-cookie';
import { GoogleIdentityGateway } from './infrastructure/google-identity.gateway';
import { TurnstileGateway } from './infrastructure/turnstile.gateway';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenVersionModule } from './token-version/token-version.module';

@Module({
    imports: [
        UsersModule,
        RbacModule,
        TokenVersionModule,
        PassportModule.register({ defaultStrategy: 'jwt', session: false }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.getOrThrow<string>('jwt.secret'),
                signOptions: {
                    expiresIn: configService.get<string>('jwt.expiresIn', '1d') as JwtExpiresIn,
                    issuer: 'd-computer-service',
                },
            }),
        }),
    ],
    controllers: [ClientAuthController, AdminAuthController],
    providers: [
        AuthService,
        GoogleAuthService,
        JwtStrategy,
        TurnstileGateway,
        TurnstileGuard,
        GoogleIdentityGateway,
        AuthCookie,
    ],
    exports: [AuthService, TokenVersionModule],
})
export class AuthModule {}
