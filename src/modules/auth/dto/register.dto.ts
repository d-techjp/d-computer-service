import { OmitType } from '@nestjs/swagger';
import { CreateUserDto } from '../../users/dto/create-user.dto';

/** Người dùng tự đăng ký: không được tự chọn role/status. */
export class RegisterDto extends OmitType(CreateUserDto, ['role', 'status'] as const) {}
