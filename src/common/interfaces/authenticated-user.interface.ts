import type { JwtSignOptions } from '@nestjs/jwt';
import type { Request } from 'express';
import type { Role } from '../enums/role.enum';

/**
 * `jsonwebtoken` khai báo expiresIn là template literal type (`ms.StringValue`),
 * còn cấu hình đọc từ env luôn là `string` — alias này để ép kiểu tại một chỗ duy nhất.
 */
export type JwtExpiresIn = NonNullable<JwtSignOptions['expiresIn']>;

/** Payload được ký vào JWT. */
export interface JwtPayload {
    /** user id */
    sub: string;
    username: string;
    email: string | null;
    role: Role;
    /** token version — phải khớp với version đang lưu trong TokenVersionStore */
    ver: number;
    iat?: number;
    exp?: number;
    iss?: string;
}

/** Object gắn vào `request.user` sau khi JwtStrategy validate thành công. */
export interface AuthenticatedUser {
    id: string;
    username: string;
    email: string | null;
    role: Role;
    tokenVersion: number;
}

export interface RequestWithUser extends Request {
    user?: AuthenticatedUser;
}
