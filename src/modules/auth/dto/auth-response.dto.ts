import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';

export class AuthUserDto {
    @ApiProperty({ format: 'uuid' }) id: string;
    @ApiProperty() username: string;
    @ApiPropertyOptional() email: string | null;
    @ApiProperty() fullName: string;
    @ApiProperty({ enum: Role }) role: Role;
}

export class AuthResponseDto {
    @ApiProperty({ description: 'JWT access token' })
    accessToken: string;

    @ApiProperty({ example: 'Bearer' })
    tokenType: string;

    @ApiProperty({ description: 'Số giây còn hiệu lực của access token', example: 86400 })
    expiresIn: number;

    @ApiProperty({ type: AuthUserDto })
    user: AuthUserDto;
}
