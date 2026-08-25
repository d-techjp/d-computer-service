import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { toTrimmed } from '../../../common/transformers/transform.helpers';

export class SocialLinkDto {
    @ApiPropertyOptional({
        format: 'uuid',
        description: 'Để trống khi thêm mới — server tự sinh id',
    })
    @IsString()
    @IsOptional()
    id?: string;

    @ApiProperty({ example: 'Facebook' })
    @Transform(toTrimmed)
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    name: string;

    // Không bắt buộc là URL tuyệt đối: cho phép cả path tương đối tới ảnh có sẵn
    // trên storefront (vd `/fb.png`), chỉ cần render được bằng thẻ <img src>.
    @ApiProperty({ example: 'https://cdn.dcomputer.local/site-settings/facebook.png' })
    @IsString()
    @MinLength(1)
    @MaxLength(500)
    logoUrl: string;

    @ApiProperty({ example: 'https://www.facebook.com/dcomputer' })
    @IsUrl()
    @MaxLength(500)
    url: string;
}
