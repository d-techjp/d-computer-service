import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_MESSAGE, PASSWORD_RULE } from '../../users/dto/create-user.dto';

export class ChangePasswordDto {
    @ApiProperty({ example: 'Admin@123456' })
    @IsString()
    @MinLength(8)
    @MaxLength(72)
    currentPassword: string;

    @ApiProperty({ example: 'NewPassword@123', minLength: 8 })
    @IsString()
    @MinLength(8)
    @MaxLength(72)
    @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE })
    newPassword: string;
}
