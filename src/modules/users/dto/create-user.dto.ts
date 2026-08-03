import { toLowerTrimmed, toTrimmed } from '../../../common/transformers/transform.helpers';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsEmail,
    IsEnum,
    IsOptional,
    IsPhoneNumber,
    IsString,
    IsUrl,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';
import { Role } from '../../../common/enums/role.enum';
import { UserStatus } from '../entities/user.entity';

export const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
export const PASSWORD_MESSAGE =
    'Mật khẩu tối thiểu 8 ký tự, gồm ít nhất 1 chữ thường, 1 chữ hoa và 1 chữ số';

export class CreateUserDto {
    @ApiProperty({ example: 'user@dcomputer.local' })
    @Transform(toLowerTrimmed)
    @IsEmail({}, { message: 'Email không hợp lệ' })
    @MaxLength(255)
    email: string;

    @ApiProperty({ example: 'Password@123', minLength: 8 })
    @IsString()
    @MinLength(8)
    @MaxLength(72)
    @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE })
    password: string;

    @ApiProperty({ example: 'Nguyễn Văn A' })
    @Transform(toTrimmed)
    @IsString()
    @MinLength(2)
    @MaxLength(150)
    fullName: string;

    @ApiPropertyOptional({ example: '0901234567' })
    @IsPhoneNumber('VN', { message: 'Số điện thoại không hợp lệ' })
    @IsOptional()
    phone?: string;

    @ApiPropertyOptional({ example: 'https://cdn.dcomputer.local/avatars/default.png' })
    @IsUrl()
    @MaxLength(500)
    @IsOptional()
    avatarUrl?: string;

    @ApiPropertyOptional({ enum: Role, default: Role.CUSTOMER })
    @IsEnum(Role)
    @IsOptional()
    role?: Role;

    @ApiPropertyOptional({ enum: UserStatus, default: UserStatus.ACTIVE })
    @IsEnum(UserStatus)
    @IsOptional()
    status?: UserStatus;
}
