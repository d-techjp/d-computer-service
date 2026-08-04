import {
    type CanActivate,
    type ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserPermissionsService } from '../../modules/rbac/user-permissions.service';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { PermissionCode } from '../enums/permission.enum';
import type { RequestWithUser } from '../interfaces/authenticated-user.interface';

/**
 * Chạy sau JwtAuthGuard. Route không gắn `@RequirePermissions(...)` thì bỏ qua —
 * việc bắt buộc đăng nhập đã do JwtAuthGuard lo.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly userPermissionsService: UserPermissionsService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) return true;

        const required = this.reflector.getAllAndOverride<PermissionCode[]>(PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!required?.length) return true;

        const { user } = context.switchToHttp().getRequest<RequestWithUser>();
        if (!user) throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');

        const granted = await this.userPermissionsService.getByRoleCode(user.role);
        if (!required.some((permission) => granted.includes(permission))) {
            throw new ForbiddenException(`Thiếu quyền: ${required.join(' hoặc ')}`);
        }
        return true;
    }
}
