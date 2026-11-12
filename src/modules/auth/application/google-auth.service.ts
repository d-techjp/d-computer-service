import { Injectable } from '@nestjs/common';
import { CustomerAccountsService } from '../../users/application/customer-accounts.service';
import type { AuthResponseDto } from '../dto/auth-response.dto';
import { GoogleIdentityGateway } from '../infrastructure/google-identity.gateway';
import { AuthService } from './auth.service';

/** Đăng nhập / đăng ký bằng Google cho khách storefront. */
@Injectable()
export class GoogleAuthService {
    constructor(
        private readonly googleIdentity: GoogleIdentityGateway,
        private readonly customerAccounts: CustomerAccountsService,
        private readonly authService: AuthService,
    ) {}

    async login(idToken: string): Promise<AuthResponseDto> {
        // Xác minh chữ ký và `aud` TRƯỚC khi đụng DB: token giả không tạo được gì
        const profile = await this.googleIdentity.verify(idToken);
        const { user, created } = await this.customerAccounts.resolveGoogleUser(profile);

        if (created) await this.authService.recordRegistration(user, 'google');
        return this.authService.completeLogin(user, 'google');
    }
}
