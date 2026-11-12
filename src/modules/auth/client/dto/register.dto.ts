import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { toLowerTrimmed, toTrimmed } from '../../../../common/transformers/transform.helpers';
import { IsJpOrVnPhone } from '../../../../common/validators/is-jp-or-vn-phone.decorator';
import { PASSWORD_MESSAGE, PASSWORD_RULE } from '../../../users/dto/create-user.dto';
import { CaptchaTokenDto } from './captcha-token.dto';

/**
 * Khách tự đăng ký trên storefront: chỉ cần họ tên, email, mật khẩu. Username
 * do server sinh từ email; vai trò luôn là `customer`.
 */
export class RegisterDto extends CaptchaTokenDto {
    @ApiProperty({ example: 'Nguyễn Văn A' })
    @Transform(toTrimmed)
    @IsString()
    @MinLength(2)
    @MaxLength(150)
    fullName: string;

    @ApiProperty({ example: 'khach@example.com' })
    @Transform(toLowerTrimmed)
    @IsEmail({}, { message: 'Email không hợp lệ' })
    @MaxLength(255)
    email: string;

    @ApiProperty({ example: 'Matkhau123', description: PASSWORD_MESSAGE })
    @IsString()
    @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE })
    @MaxLength(72)
    password: string;

    @ApiPropertyOptional({ example: '090-1234-5678' })
    @Transform(toTrimmed)
    @IsOptional()
    @IsJpOrVnPhone()
    phone?: string;
}
