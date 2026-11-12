import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

/**
 * Token Cloudflare Turnstile. `TurnstileGuard` mới là chỗ xác minh; khai báo ở
 * đây để ValidationPipe (`forbidNonWhitelisted`) không từ chối field này.
 */
export class CaptchaTokenDto {
    @ApiProperty({ description: 'Token Cloudflare Turnstile, chỉ dùng được một lần' })
    @IsString()
    @MaxLength(2048)
    captchaToken: string;
}
