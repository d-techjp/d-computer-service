import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
    IsArray,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
    ValidateNested,
} from 'class-validator';
import { toTrimmed } from '../../../common/transformers/transform.helpers';
import { FooterColumnDto } from './footer-column.dto';
import { SocialLinkDto } from './social-link.dto';

/**
 * PATCH toàn phần — field không gửi thì giữ nguyên giá trị cũ. Riêng
 * `socialLinks`/`footerColumns` (nếu gửi) THAY THẾ TOÀN BỘ mảng cũ, không merge
 * từng phần tử: đây là cách duy nhất để xoá một link/cột đang có, cùng quy ước
 * với `CarouselsService.update()` xử lý `filters`.
 */
export class UpdateSiteSettingsDto {
    @ApiPropertyOptional({ example: 'D-TECH' })
    @Transform(toTrimmed)
    @IsString()
    @MinLength(1)
    @MaxLength(150)
    @IsOptional()
    companyName?: string;

    @ApiPropertyOptional({ example: '080-6473-2260' })
    @Transform(toTrimmed)
    @IsString()
    @MinLength(1)
    @MaxLength(50)
    @IsOptional()
    phone?: string;

    @ApiPropertyOptional({ example: '大阪市西成区玉出東１－３－１６ ドエル１番館103号' })
    @Transform(toTrimmed)
    @IsString()
    @MinLength(1)
    @MaxLength(500)
    @IsOptional()
    address?: string;

    @ApiPropertyOptional({ type: [SocialLinkDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SocialLinkDto)
    @IsOptional()
    socialLinks?: SocialLinkDto[];

    @ApiPropertyOptional({ type: [FooterColumnDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => FooterColumnDto)
    @IsOptional()
    footerColumns?: FooterColumnDto[];
}
