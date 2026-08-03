import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { SoftDeletableEntity } from '../../../common/entities/base.entity';
import { Category } from '../../categories/entities/category.entity';
import { User } from '../../users/entities/user.entity';

export enum ArticleStatus {
    DRAFT = 'draft',
    PUBLISHED = 'published',
    ARCHIVED = 'archived',
}

@Entity('articles')
@Index('idx_articles_status_published_at', ['status', 'publishedAt'])
export class Article extends SoftDeletableEntity {
    @ApiProperty({ example: 'Top 5 laptop văn phòng đáng mua 2026' })
    @Column({ type: 'varchar', length: 255 })
    title: string;

    @ApiProperty({ example: 'top-5-laptop-van-phong-dang-mua-2026' })
    @Index('uq_articles_slug', { unique: true, where: '"deleted_at" IS NULL' })
    @Column({ type: 'varchar', length: 300 })
    slug: string;

    @ApiPropertyOptional({ description: 'Đoạn tóm tắt hiển thị ở danh sách' })
    @Column({ type: 'varchar', length: 500, nullable: true })
    excerpt: string | null;

    @ApiProperty({ description: 'Nội dung bài viết (HTML hoặc Markdown)' })
    @Column({ type: 'text' })
    content: string;

    @ApiPropertyOptional()
    @Column({ type: 'varchar', length: 500, nullable: true })
    thumbnail: string | null;

    @ApiProperty({ enum: ArticleStatus, default: ArticleStatus.DRAFT })
    @Column({ type: 'enum', enum: ArticleStatus, default: ArticleStatus.DRAFT })
    status: ArticleStatus;

    @ApiPropertyOptional({ description: 'Thời điểm xuất bản — null khi còn ở trạng thái nháp' })
    @Column({ type: 'timestamptz', nullable: true })
    publishedAt: Date | null;

    @ApiPropertyOptional({ type: [String] })
    @Column({ type: 'jsonb', nullable: true })
    tags: string[] | null;

    @ApiProperty({ default: 0 })
    @Column({ type: 'int', default: 0 })
    viewCount: number;

    @ApiPropertyOptional({ description: 'Tiêu đề SEO, mặc định lấy theo title' })
    @Column({ type: 'varchar', length: 255, nullable: true })
    metaTitle: string | null;

    @ApiPropertyOptional()
    @Column({ type: 'varchar', length: 500, nullable: true })
    metaDescription: string | null;

    @ApiPropertyOptional({ format: 'uuid' })
    @Column({ type: 'uuid', nullable: true })
    categoryId: string | null;

    @ManyToOne(() => Category, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'category_id' })
    category: Category | null;

    @ApiPropertyOptional({ format: 'uuid' })
    @Column({ type: 'uuid', nullable: true })
    authorId: string | null;

    @ManyToOne(() => User, (user) => user.articles, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'author_id' })
    author: User | null;
}
