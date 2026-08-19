import { Injectable } from '@nestjs/common';
import { TiktokVideosService } from '../application/tiktok-videos.service';
import { toPublicTiktokVideo, type PublicTiktokVideoDto } from './dto/public-tiktok-video.dto';

/**
 * Lớp mỏng bọc `TiktokVideosService` cho storefront: chỉ video đang bật, và cắt
 * bỏ phần dữ liệu quản trị trước khi trả ra. Không có endpoint chi tiết — video
 * tắt sẽ đơn giản là biến mất khỏi danh sách.
 */
@Injectable()
export class ClientTiktokVideosService {
    constructor(private readonly tiktokVideosService: TiktokVideosService) {}

    async findAll(): Promise<PublicTiktokVideoDto[]> {
        const videos = await this.tiktokVideosService.findActive();
        return videos.map(toPublicTiktokVideo);
    }
}
