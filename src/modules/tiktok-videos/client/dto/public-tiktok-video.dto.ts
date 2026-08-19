import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TiktokVideo } from '../../entities/tiktok-video.entity';

/**
 * Bản video dành cho storefront. Không có `isActive`/`deletedAt` (chuyện quản trị);
 * `sortOrder` thì giữ lại vì FE có thể cần sắp lại sau khi cache/merge dữ liệu.
 */
export class PublicTiktokVideoDto {
    @ApiProperty({ format: 'uuid' }) id: string;

    @ApiProperty({ example: 'https://www.tiktok.com/@dtech/video/7412345678901234567' })
    videoUrl: string;

    @ApiPropertyOptional({ nullable: true }) thumbnailUrl: string | null;
    @ApiPropertyOptional({ nullable: true }) description: string | null;
    @ApiProperty() sortOrder: number;
    @ApiProperty() createdAt: Date;
}

export const toPublicTiktokVideo = (video: TiktokVideo): PublicTiktokVideoDto => ({
    id: video.id,
    videoUrl: video.videoUrl,
    thumbnailUrl: video.thumbnailUrl,
    description: video.description,
    sortOrder: video.sortOrder,
    createdAt: video.createdAt,
});
