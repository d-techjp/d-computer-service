import { SetMetadata } from '@nestjs/common';
import type { Role } from '../enums/role.enum';

export const ROLES_KEY = 'roles';

/** Chỉ cho phép các role được liệt kê truy cập route/controller. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
