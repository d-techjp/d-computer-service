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
import { UserStatus } from '../entities/user.entity';

export const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
export const PASSWORD_MESSAGE =
    'Mật khẩu tối thiểu 8 ký tự, gồm ít nhất 1 chữ thường, 1 chữ hoa và 1 chữ số';

export const USERNAME_RULE = /^[a-zA-Z0-9_.]+$/;
export const USERNAME_MESSAGE = 'Username chỉ gồm chữ, số, dấu chấm và gạch dưới';

export class CreateUserDto {
    @ApiProperty({ example: 'nguyenvana' })
    @Transform(toLowerTrimmed)
    @IsString()
    @Matches(USERNAME_RULE, { message: USERNAME_MESSAGE })
    @MinLength(3)
    @MaxLength(50)
    username: string;

    @ApiPropertyOptional({ example: 'user@dcomputer.local' })
    @Transform(toLowerTrimmed)
    @IsEmail({}, { message: 'Email không hợp lệ' })
    @MaxLength(255)
    @IsOptional()
    email?: string;

    @ApiProperty({ example: 'Password@123', minLength: 6 })
    @IsString()
    @MinLength(6)
    @MaxLength(72)
    // @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE })
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

    @ApiPropertyOptional({
        example: 'staff',
        description:
            'Code vai trò (lấy từ `GET /roles/options`) — bỏ trống thì mặc định là khách hàng',
    })
    @Transform(toLowerTrimmed)
    @IsString()
    @MaxLength(50)
    @IsOptional()
    roleCode?: string;

    @ApiPropertyOptional({ enum: UserStatus, default: UserStatus.ACTIVE })
    @IsEnum(UserStatus)
    @IsOptional()
    status?: UserStatus;
}
