import { OmitType } from '@nestjs/swagger';
import { CreateUserDto } from '../../users/dto/create-user.dto';

/** Người dùng tự đăng ký: không được tự chọn vai trò/trạng thái. */
export class RegisterDto extends OmitType(CreateUserDto, ['roleCode', 'status'] as const) {}
