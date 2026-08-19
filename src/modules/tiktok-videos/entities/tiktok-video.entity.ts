import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index } from 'typeorm';
import { SoftDeletableEntity } from '../../../common/entities/base.entity';

/**
 * Một video TikTok được gắn tay lên storefront. Khác `Carousel` ở chỗ nội dung
 * KHÔNG sinh từ bộ lọc — đây là danh sách link do người vận hành chọn, nên thứ
 * tự hiển thị (`sortOrder`) là dữ liệu nghiệp vụ chứ không phải tiểu tiết UI.
 *
 * Thumbnail lưu URL đã upload lên R2 (qua `POST /uploads/images`) thay vì lấy
 * động từ TikTok: ảnh của họ có token hết hạn và chặn hotlink, nhúng thẳng thì
 * ảnh chết sau vài ngày.
 */
@Entity('tiktok_videos')
@Index('idx_tiktok_videos_active_sort', ['isActive', 'sortOrder'])
export class TiktokVideo extends SoftDeletableEntity {
    @ApiProperty({ example: 'https://www.tiktok.com/@dtech/video/7412345678901234567' })
    @Column({ type: 'varchar', length: 500 })
    videoUrl: string;

    @ApiPropertyOptional({ description: 'Ảnh đại diện của video, URL sau khi upload' })
    @Column({ type: 'varchar', length: 500, nullable: true })
    thumbnailUrl: string | null;

    @ApiPropertyOptional({ example: 'Đập hộp laptop gaming mới về' })
    @Column({ type: 'text', nullable: true })
    description: string | null;

    @ApiProperty({ default: 0, description: 'Thứ tự hiển thị, nhỏ hơn đứng trước' })
    @Column({ type: 'int', default: 0 })
    sortOrder: number;

    @ApiProperty({ default: true, description: 'Tắt = ẩn khỏi storefront' })
    @Column({ type: 'boolean', default: true })
    isActive: boolean;
}
