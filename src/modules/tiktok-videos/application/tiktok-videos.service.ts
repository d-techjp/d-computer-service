import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import { TiktokVideosRepository } from '../domain/tiktok-videos.repository';
import type { CreateTiktokVideoDto } from '../dto/create-tiktok-video.dto';
import type { QueryTiktokVideoDto } from '../dto/query-tiktok-video.dto';
import type { ReorderTiktokVideosDto } from '../dto/reorder-tiktok-videos.dto';
import type { UpdateTiktokVideoDto } from '../dto/update-tiktok-video.dto';
import { TiktokVideo } from '../entities/tiktok-video.entity';

/**
 * CRUD video TikTok. Nghiệp vụ riêng chỉ có hai thứ: video mới mặc định xuống
 * cuối danh sách, và lệnh sắp xếp lại phải trọn vẹn (gác id trước khi ghi).
 */
@Injectable()
export class TiktokVideosService {
    constructor(private readonly tiktokVideosRepository: TiktokVideosRepository) {}

    async create(dto: CreateTiktokVideoDto): Promise<TiktokVideo> {
        // Không gửi `sortOrder` -> xuống cuối. Nếu để mặc định 0 thì video mới
        // luôn chen lên đầu trang chủ, ngược với kỳ vọng của người vận hành.
        const sortOrder =
            dto.sortOrder ?? (await this.tiktokVideosRepository.findMaxSortOrder()) + 1;

        return this.tiktokVideosRepository.save(
            this.tiktokVideosRepository.create({ ...dto, sortOrder }),
        );
    }

    async findAll(query: QueryTiktokVideoDto): Promise<PaginatedResult<TiktokVideo>> {
        const page = await this.tiktokVideosRepository.search(query);
        return new PaginatedResult(page.items, page.total, query.page, query.limit);
    }

    findActive(): Promise<TiktokVideo[]> {
        return this.tiktokVideosRepository.findActive();
    }

    async findOne(id: string): Promise<TiktokVideo> {
        const video = await this.tiktokVideosRepository.findById(id);
        if (!video) throw new NotFoundException(`Không tìm thấy video TikTok với id ${id}`);
        return video;
    }

    async update(id: string, dto: UpdateTiktokVideoDto): Promise<TiktokVideo> {
        const video = await this.findOne(id);
        Object.assign(video, dto);
        return this.tiktokVideosRepository.save(video);
    }

    async remove(id: string): Promise<void> {
        await this.tiktokVideosRepository.softRemove(await this.findOne(id));
    }

    async reorder(dto: ReorderTiktokVideosDto): Promise<void> {
        const ids = dto.items.map((item) => item.id);
        if (new Set(ids).size !== ids.length) {
            throw new BadRequestException('Danh sách sắp xếp có id trùng nhau');
        }

        // Gác trước khi ghi: thiếu một id là hỏng cả lệnh, không sắp xếp một nửa
        const existing = await this.tiktokVideosRepository.countByIds(ids);
        if (existing !== ids.length) {
            throw new NotFoundException('Danh sách sắp xếp chứa video không tồn tại');
        }

        await this.tiktokVideosRepository.updateSortOrders(dto.items);
    }
}
