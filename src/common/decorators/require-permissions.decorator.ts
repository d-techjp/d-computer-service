import { SetMetadata } from '@nestjs/common';
import type { PermissionCode } from '../enums/permission.enum';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Chặn route theo permission thay vì theo role — user có role nào không quan
 * trọng, miễn role đó được gán permission tương ứng.
 *
 * Nhiều permission = thoả **một** trong số đó là qua (OR).
 */
export const RequirePermissions = (...permissions: PermissionCode[]) =>
    SetMetadata(PERMISSIONS_KEY, permissions);
