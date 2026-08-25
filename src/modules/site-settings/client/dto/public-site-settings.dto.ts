import { ApiProperty } from '@nestjs/swagger';
import { FooterColumn, SiteSettings, SocialLink } from '../../entities/site-settings.entity';

/** Bản thông tin cửa hàng dành cho storefront — không có `id`/`createdAt`/`updatedAt` (chuyện quản trị). */
export class PublicSiteSettingsDto {
    @ApiProperty({ example: 'D-TECH' }) companyName: string;
    @ApiProperty({ example: '080-6473-2260' }) phone: string;
    @ApiProperty({ example: '大阪市西成区玉出東１－３－１６ ドエル１番館103号' }) address: string;
    @ApiProperty({ type: () => [SocialLink] }) socialLinks: SocialLink[];
    @ApiProperty({ type: () => [FooterColumn] }) footerColumns: FooterColumn[];
}

export const toPublicSiteSettings = (settings: SiteSettings): PublicSiteSettingsDto => ({
    companyName: settings.companyName,
    phone: settings.phone,
    address: settings.address,
    socialLinks: settings.socialLinks,
    footerColumns: settings.footerColumns,
});
