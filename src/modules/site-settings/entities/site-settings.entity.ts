import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/** Một link mạng xã hội ở footer: logo + đường dẫn liên kết. */
export class SocialLink {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ example: 'Facebook' })
    name: string;

    @ApiProperty({ example: 'https://cdn.dcomputer.local/site-settings/facebook.png' })
    logoUrl: string;

    @ApiProperty({ example: 'https://www.facebook.com/dcomputer' })
    url: string;
}

/** Một link trong cột điều hướng ở footer — `url` có thể là path nội bộ storefront hoặc URL ngoài. */
export class FooterLink {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ example: 'Danh sách sản phẩm' })
    label: string;

    @ApiProperty({
        example: '/products',
        description: 'Path nội bộ (bắt đầu bằng "/") hoặc URL ngoài',
    })
    url: string;
}

/** Một cột điều hướng ở footer: "Sản phẩm · Dịch vụ", "Hướng dẫn", "Hỗ trợ", "Công ty"... */
export class FooterColumn {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ example: 'Sản phẩm · Dịch vụ' })
    title: string;

    @ApiProperty({ type: () => [FooterLink] })
    links: FooterLink[];
}

/**
 * Thông tin cửa hàng hiển thị ở footer storefront — chỉ MỘT bản ghi (singleton),
 * không có `id` cố định trước: `SiteSettingsService.get()` tự tạo bản ghi rỗng ở
 * lần đọc đầu tiên nếu bảng chưa có dòng nào.
 *
 * Không soft-delete: không có nghiệp vụ "xoá" thông tin cửa hàng, chỉ có sửa.
 *
 * `socialLinks` lưu JSONB dạng MẢNG (không phải object theo key) vì JSONB array
 * giữ đúng thứ tự phần tử — object thì Postgres không đảm bảo thứ tự key, trong
 * khi thứ tự hiển thị các icon mạng xã hội ở footer là dữ liệu nghiệp vụ.
 */
@Entity('site_settings')
export class SiteSettings extends BaseEntity {
    @ApiProperty({ example: 'D-TECH' })
    @Column({ type: 'varchar', length: 150, default: '' })
    companyName: string;

    @ApiProperty({ example: '080-6473-2260', description: 'Hotline liên hệ hiển thị ở footer' })
    @Column({ type: 'varchar', length: 50, default: '' })
    phone: string;

    @ApiProperty({ example: '大阪市西成区玉出東１－３－１６ ドエル１番館103号' })
    @Column({ type: 'varchar', length: 500, default: '' })
    address: string;

    @ApiProperty({ type: () => [SocialLink] })
    @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
    socialLinks: SocialLink[];

    @ApiProperty({ type: () => [FooterColumn] })
    @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
    footerColumns: FooterColumn[];
}
