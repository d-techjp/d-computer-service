import {
    BadRequestException,
    Injectable,
    Logger,
    ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TIMEOUT_MS = 5000;

interface SiteverifyResponse {
    success: boolean;
    'error-codes'?: string[];
}

/**
 * Xác minh token Cloudflare Turnstile ở phía server — chỗ duy nhất gọi API của
 * Turnstile. Token chỉ dùng được MỘT lần và hết hạn sau 5 phút, nên bot không
 * thể chụp một token rồi gửi lặp lại hàng loạt request đăng ký.
 *
 * Fail-closed: thiếu secret hoặc Cloudflare không phản hồi thì từ chối, vì mở
 * cửa khi captcha hỏng chính là thứ một đợt spam cần.
 */
@Injectable()
export class TurnstileGateway {
    private readonly logger = new Logger(TurnstileGateway.name);
    private readonly secretKey: string;

    constructor(configService: ConfigService) {
        this.secretKey = configService.get<string>('auth.turnstileSecretKey', '');
        if (!this.secretKey) {
            this.logger.warn(
                'Thiếu TURNSTILE_SECRET_KEY — đăng ký/đăng nhập storefront sẽ trả 503',
            );
        }
    }

    async verify(token: string | undefined, remoteIp?: string): Promise<void> {
        if (!this.secretKey) {
            throw new ServiceUnavailableException('Chưa cấu hình xác minh chống bot');
        }
        if (!token) throw new BadRequestException('Vui lòng hoàn thành xác minh chống bot');

        const body = new URLSearchParams({ secret: this.secretKey, response: token });
        if (remoteIp) body.set('remoteip', remoteIp);

        let result: SiteverifyResponse;
        try {
            const response = await fetch(SITEVERIFY_URL, {
                method: 'POST',
                body,
                signal: AbortSignal.timeout(TIMEOUT_MS),
            });
            result = (await response.json()) as SiteverifyResponse;
        } catch (error) {
            this.logger.error(`Không gọi được Turnstile siteverify: ${String(error)}`);
            throw new ServiceUnavailableException('Không xác minh được, vui lòng thử lại sau');
        }

        if (!result.success) {
            this.logger.warn(`Turnstile từ chối: ${(result['error-codes'] ?? []).join(',')}`);
            throw new BadRequestException('Xác minh chống bot thất bại, vui lòng thử lại');
        }
    }
}
