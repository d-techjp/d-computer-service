import { PartialType, PickType } from '@nestjs/swagger';
import { CreateUserDto } from '../../dto/create-user.dto';

/**
 * Những gì khách được tự sửa ở trang Tài khoản. Hẹp hơn `UpdateUserDto` của admin:
 * đổi `username` / `email` sẽ đụng tới đăng nhập (và liên kết Google theo email),
 * không phải thứ nên cho sửa từ một form hồ sơ.
 */
export class UpdateProfileDto extends PartialType(
    PickType(CreateUserDto, ['fullName', 'phone'] as const),
) {}
