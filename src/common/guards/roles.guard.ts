import {
    type CanActivate,
    type ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { RoleCode } from '../enums/role.enum';
import type { RequestWithUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) return true;

        const requiredRoles = this.reflector.getAllAndOverride<RoleCode[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredRoles?.length) return true;

        const { user } = context.switchToHttp().getRequest<RequestWithUser>();
        // So khớp trên chuỗi: `user.role` là code role lấy từ DB, có thể là role
        // do admin tự tạo (không nằm trong enum RoleCode).
        const grantedRole = String(user?.role ?? '');
        if (!user || !requiredRoles.some((role) => String(role) === grantedRole)) {
            throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
        }
        return true;
    }
}
