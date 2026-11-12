import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { TurnstileGateway } from '../infrastructure/turnstile.gateway';

/**
 * Chạy trước ValidationPipe và trước service: request của bot bị chặn mà không
 * chạm tới DB, bcrypt hay `issueToken` (nơi tăng token version). DTO vẫn khai
 * báo `captchaToken` để qua được `forbidNonWhitelisted`.
 */
@Injectable()
export class TurnstileGuard implements CanActivate {
    constructor(private readonly turnstile: TurnstileGateway) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const body = request.body as { captchaToken?: unknown } | undefined;
        const token = typeof body?.captchaToken === 'string' ? body.captchaToken : undefined;

        await this.turnstile.verify(token, request.ip);
        return true;
    }
}
