import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { toLowerTrimmed } from '../../../common/transformers/transform.helpers';

export class LoginDto {
    @ApiProperty({ example: 'admin' })
    @Transform(toLowerTrimmed)
    @IsString()
    @MinLength(3)
    @MaxLength(50)
    username: string;

    @ApiProperty({ example: 'Admin@123456' })
    @IsString()
    @MinLength(6)
    @MaxLength(72)
    password: string;
}
