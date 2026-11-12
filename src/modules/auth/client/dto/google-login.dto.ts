import { ApiProperty } from '@nestjs/swagger';
import { IsJWT } from 'class-validator';
import { CaptchaTokenDto } from './captcha-token.dto';

export class GoogleLoginDto extends CaptchaTokenDto {
    @ApiProperty({ description: 'ID token (credential) do Google Identity Services trả về' })
    @IsJWT({ message: 'ID token Google không hợp lệ' })
    idToken: string;
}
