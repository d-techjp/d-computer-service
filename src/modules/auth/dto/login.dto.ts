import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { toLowerTrimmed } from '../../../common/transformers/transform.helpers';

export class LoginDto {
    @ApiProperty({ example: 'admin@dcomputer.local' })
    @Transform(toLowerTrimmed)
    @IsEmail({}, { message: 'Email không hợp lệ' })
    @MaxLength(255)
    email: string;

    @ApiProperty({ example: 'Admin@123456' })
    @IsString()
    @MinLength(8)
    @MaxLength(72)
    password: string;
}
