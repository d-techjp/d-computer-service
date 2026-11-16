import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index } from 'typeorm';
import { SoftDeletableEntity } from '../../../common/entities/base.entity';

export enum PageStatus {
    DRAFT = 'draft',
    PUBLISHED = 'published',
}

/**
 * Trang tĩnh của storefront (chính sách bảo mật, giới thiệu, hướng dẫn…), hiện ở
 * `/{slug}` ngay dưới gốc site. Tách riêng khỏi `articles` vì không có chuyên
 * mục, tác giả, lượt xem, ảnh bìa — và không được lẫn vào danh sách blog.
 *
 * Storefront chỉ tiếng Nhật nên mỗi trang một bộ nội dung.
 */
@Entity('pages')
export class Page extends SoftDeletableEntity {
    @ApiProperty({ example: 'プライバシーポリシー' })
    @Column({ type: 'varchar', length: 255 })
    title: string;

    @ApiProperty({ example: 'privacy', description: 'Đường dẫn trên storefront: /{slug}' })
    @Index('uq_pages_slug', { unique: true, where: '"deleted_at" IS NULL' })
    @Column({ type: 'varchar', length: 180 })
    slug: string;

    @ApiProperty({ description: 'Nội dung HTML từ editor của admin' })
    @Column({ type: 'text' })
    content: string;

    @ApiProperty({ enum: PageStatus, default: PageStatus.DRAFT })
    @Column({ type: 'enum', enum: PageStatus, default: PageStatus.DRAFT })
    status: PageStatus;

    @ApiPropertyOptional({ description: 'Lần xuất bản đầu tiên — null khi chưa từng xuất bản' })
    @Column({ type: 'timestamptz', nullable: true })
    publishedAt: Date | null;

    @ApiPropertyOptional({ description: 'Tiêu đề SEO, bỏ trống thì dùng title' })
    @Column({ type: 'varchar', length: 255, nullable: true })
    metaTitle: string | null;

    @ApiPropertyOptional({ description: 'Mô tả SEO hiện ở kết quả tìm kiếm' })
    @Column({ type: 'varchar', length: 500, nullable: true })
    metaDescription: string | null;
}
