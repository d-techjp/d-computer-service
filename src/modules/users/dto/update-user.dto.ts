import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

/**
 * - `password`: đổi qua `/auth/change-password`, không qua endpoint update.
 * - `roleCode`: đổi qua `PUT /users/:id/role` — endpoint đó còn thu hồi token của
 *   user, cho phép đổi ở đây sẽ bỏ qua bước đó và giữ nguyên quyền cũ trong JWT.
 */
export class UpdateUserDto extends PartialType(
    OmitType(CreateUserDto, ['password', 'roleCode'] as const),
) {}
