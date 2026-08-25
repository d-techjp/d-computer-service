import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import { slugify } from '../../../common/utils/slug.util';
import {
    buildFilterQuery,
    normalizeFilters,
    type CarouselFilters,
} from '../domain/carousel-filters';
import { CarouselsRepository } from '../domain/carousels.repository';
import type { CreateCarouselDto } from '../dto/create-carousel.dto';
import type { QueryCarouselDto } from '../dto/query-carousel.dto';
import type { ReorderCarouselsDto } from '../dto/reorder-carousels.dto';
import type { UpdateCarouselDto } from '../dto/update-carousel.dto';
import { Carousel } from '../entities/carousel.entity';

/**
 * CRUD carousel. Nghiệp vụ riêng của module chỉ có hai thứ: sinh slug duy nhất
 * (giống brand/product) và giữ `filters` với `filterQuery` luôn khớp nhau —
 * `filterQuery` không bao giờ đến từ client, luôn dựng lại từ `filters`.
 */
@Injectable()
export class CarouselsService {
    constructor(private readonly carouselsRepository: CarouselsRepository) {}

    async create(dto: CreateCarouselDto): Promise<Carousel> {
        const { filters, ...rest } = dto;
        const slug = await this.resolveSlug(dto.slug ?? dto.name);
        // Không gửi `sortOrder` -> xuống cuối. Nếu để mặc định 0 thì carousel mới
        // luôn chen lên đầu trang chủ, ngược với kỳ vọng của người vận hành.
        const sortOrder = dto.sortOrder ?? (await this.carouselsRepository.findMaxSortOrder()) + 1;

        return this.carouselsRepository.save(
            this.carouselsRepository.create({
                ...rest,
                slug,
                sortOrder,
                ...this.buildFilterColumns(filters ?? {}),
            }),
        );
    }

    async findAll(query: QueryCarouselDto): Promise<PaginatedResult<Carousel>> {
        const page = await this.carouselsRepository.search(query);
        return new PaginatedResult(page.items, page.total, query.page, query.limit);
    }

    findActive(): Promise<Carousel[]> {
        return this.carouselsRepository.findActive();
    }

    async findOne(id: string): Promise<Carousel> {
        const carousel = await this.carouselsRepository.findById(id);
        if (!carousel) throw new NotFoundException(`Không tìm thấy carousel với id ${id}`);
        return carousel;
    }

    async findBySlug(slug: string): Promise<Carousel> {
        const carousel = await this.carouselsRepository.findBySlug(slug);
        if (!carousel) throw new NotFoundException(`Không tìm thấy carousel với slug ${slug}`);
        return carousel;
    }

    async update(id: string, dto: UpdateCarouselDto): Promise<Carousel> {
        const carousel = await this.findOne(id);

        if (dto.slug && dto.slug !== carousel.slug) {
            carousel.slug = await this.resolveSlug(dto.slug, id);
        } else if (dto.name && dto.name !== carousel.name && !dto.slug) {
            carousel.slug = await this.resolveSlug(dto.name, id);
        }

        const { slug: _slug, filters, ...rest } = dto;
        Object.assign(carousel, rest);

        // Thay nguyên cụm, không merge từng key: merge thì không có cách nào bỏ
        // một điều kiện đã đặt. Không gửi `filters` = giữ nguyên bộ lọc cũ.
        if (filters) Object.assign(carousel, this.buildFilterColumns(filters));

        return this.carouselsRepository.save(carousel);
    }

    async remove(id: string): Promise<void> {
        await this.carouselsRepository.softRemove(await this.findOne(id));
    }

    async reorder(dto: ReorderCarouselsDto): Promise<void> {
        const ids = dto.items.map((item) => item.id);
        if (new Set(ids).size !== ids.length) {
            throw new BadRequestException('Danh sách sắp xếp có id trùng nhau');
        }

        // Gác trước khi ghi: thiếu một id là hỏng cả lệnh, không sắp xếp một nửa
        const existing = await this.carouselsRepository.countByIds(ids);
        if (existing !== ids.length) {
            throw new NotFoundException('Danh sách sắp xếp chứa carousel không tồn tại');
        }

        await this.carouselsRepository.updateSortOrders(dto.items);
    }

    /** `filters` (nguồn sự thật) và `filterQuery` (bản đọc được) luôn sinh cùng một chỗ. */
    private buildFilterColumns(
        filters: CarouselFilters,
    ): Pick<Carousel, 'filters' | 'filterQuery'> {
        const normalized = normalizeFilters(filters);
        return { filters: normalized, filterQuery: buildFilterQuery(normalized) };
    }

    /** Sinh slug duy nhất; trùng thì nối hậu tố -2, -3, ... */
    private async resolveSlug(source: string, excludeId?: string): Promise<string> {
        const base = slugify(source);
        if (!base) throw new BadRequestException('Không tạo được slug hợp lệ từ tên carousel');

        let candidate = base;
        let suffix = 1;
        while ((await this.carouselsRepository.countBySlug(candidate, excludeId)) > 0) {
            suffix += 1;
            candidate = `${base}-${suffix}`;
        }
        return candidate;
    }
}
