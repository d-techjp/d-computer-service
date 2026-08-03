import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { JwtExpiresIn } from '../../common/interfaces/authenticated-user.interface';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { InMemoryTokenVersionStore } from './token-version/in-memory-token-version.store';
import { TokenVersionStore } from './token-version/token-version.store';

@Module({
    imports: [
        UsersModule,
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
    controllers: [AuthController],
    providers: [
        AuthService,
        JwtStrategy,
        // Đổi sang RedisTokenVersionStore ở đây khi chạy nhiều instance
        { provide: TokenVersionStore, useClass: InMemoryTokenVersionStore },
    ],
    exports: [AuthService, TokenVersionStore],
})
export class AuthModule {}
