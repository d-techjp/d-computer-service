import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { toLowerTrimmed } from '../../../../common/transformers/transform.helpers';
import { CaptchaTokenDto } from './captcha-token.dto';

/** Đăng nhập storefront: nhận username hoặc email. */
export class ClientLoginDto extends CaptchaTokenDto {
    @ApiProperty({ example: 'khach@example.com', description: 'Username hoặc email' })
    @Transform(toLowerTrimmed)
    @IsString()
    @MinLength(3)
    @MaxLength(255)
    username: string;

    @ApiProperty({ example: 'Matkhau123' })
    @IsString()
    @MinLength(6)
    @MaxLength(72)
    password: string;
}
