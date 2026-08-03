import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type {
    AuthenticatedUser,
    RequestWithUser,
} from '../interfaces/authenticated-user.interface';

/**
 * `@CurrentUser()` -> toàn bộ user; `@CurrentUser('id')` -> một field.
 */
export const CurrentUser = createParamDecorator(
    (field: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest<RequestWithUser>();
        const user = request.user;
        if (!user) return undefined;
        return field ? user[field] : user;
    },
);
