import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

/** Không cho đổi mật khẩu qua endpoint update — dùng /auth/change-password hoặc reset riêng. */
export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['password'] as const)) {}
