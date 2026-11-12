import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';

/** Phải trùng tên cookie mà storefront (BFF khi dev) đọc/ghi. */
export const AUTH_COOKIE = 'dcs_session';

/**
 * Phiên storefront nằm trong cookie httpOnly: JS trên trang không đọc được
 * token, nên một lỗi XSS không lấy token mang đi nơi khác được.
 *
 * `SameSite=Lax`: trình duyệt không gửi cookie trong fetch/form POST từ site
 * khác, nên không cần CSRF token. Đi kèm CORS `credentials: false` (main.ts),
 * site khác cũng không đọc được response có cookie.
 */
@Injectable()
export class AuthCookie {
    private readonly secure: boolean;

    constructor(configService: ConfigService) {
        this.secure = configService.get<string>('app.env') === 'production';
    }

    set(response: Response, accessToken: string, maxAgeSeconds: number): void {
        response.cookie(AUTH_COOKIE, accessToken, {
            ...this.baseOptions(),
            maxAge: maxAgeSeconds * 1000,
        });
    }

    clear(response: Response): void {
        response.clearCookie(AUTH_COOKIE, this.baseOptions());
    }

    private baseOptions(): CookieOptions {
        return { httpOnly: true, secure: this.secure, sameSite: 'lax', path: '/' };
    }
}

/**
 * Bộ đọc token cho passport-jwt. Tự tách header `Cookie` để khỏi thêm
 * `cookie-parser` chỉ vì một cookie.
 */
export function extractTokenFromCookie(request: Request): string | null {
    const header = request.headers.cookie;
    if (!header) return null;

    for (const part of header.split(';')) {
        const separator = part.indexOf('=');
        if (separator === -1) continue;
        if (part.slice(0, separator).trim() !== AUTH_COOKIE) continue;
        const value = part.slice(separator + 1).trim();
        try {
            return value ? decodeURIComponent(value) : null;
        } catch {
            return null;
        }
    }
    return null;
}
