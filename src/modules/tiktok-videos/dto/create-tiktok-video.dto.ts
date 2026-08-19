import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsBoolean,
    IsInt,
    IsOptional,
    IsString,
    IsUrl,
    Matches,
    MaxLength,
    Min,
} from 'class-validator';
import { toInteger, toTrimmed } from '../../../common/transformers/transform.helpers';

/**
 * Chỉ nhận link tiktok.com (kể cả link rút gọn vm./vt.). Chặn ở DTO thay vì để
 * lọt xuống DB rồi mới phát hiện: storefront nhúng thẳng link này vào iframe/
 * embed, dán nhầm domain khác là mở đường cho nội dung lạ vào trang.
 */
export const TIKTOK_URL_RULE = /^https:\/\/([a-z0-9-]+\.)*tiktok\.com\/.+/i;
export const TIKTOK_URL_MESSAGE = 'videoUrl phải là link https tới tiktok.com';

export class CreateTiktokVideoDto {
    @ApiProperty({ example: 'https://www.tiktok.com/@dtech/video/7412345678901234567' })
    @Transform(toTrimmed)
    @IsString()
    @MaxLength(500)
    @Matches(TIKTOK_URL_RULE, { message: TIKTOK_URL_MESSAGE })
    videoUrl: string;

    // `null` được chấp nhận (và @IsOptional bỏ qua validate) để client xoá hẳn
    // giá trị cũ — gửi `undefined` chỉ có nghĩa "không đụng tới field này".
    @ApiPropertyOptional({
        nullable: true,
        example: 'https://cdn.dcomputer.local/tiktok/dap-hop-laptop.jpg',
    })
    @IsUrl()
    @MaxLength(500)
    @IsOptional()
    thumbnailUrl?: string | null;

    @ApiPropertyOptional({ nullable: true, example: 'Đập hộp laptop gaming mới về' })
    @Transform(toTrimmed)
    @IsString()
    @MaxLength(1000)
    @IsOptional()
    description?: string | null;

    @ApiPropertyOptional({ default: 0 })
    @Transform(toInteger)
    @IsInt()
    @Min(0)
    @IsOptional()
    sortOrder?: number;

    @ApiPropertyOptional({ default: true })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
