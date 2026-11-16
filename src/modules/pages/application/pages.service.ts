import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import { PagesRepository } from '../domain/pages.repository';
import { RESERVED_PAGE_SLUGS } from '../domain/reserved-page-slugs';
import type { CreatePageDto } from '../dto/create-page.dto';
import type { QueryPageDto } from '../dto/query-page.dto';
import type { UpdatePageDto } from '../dto/update-page.dto';
import { Page, PageStatus } from '../entities/page.entity';

@Injectable()
export class PagesService {
    constructor(private readonly pagesRepository: PagesRepository) {}

    async create(dto: CreatePageDto): Promise<Page> {
        await this.assertSlugAvailable(dto.slug);

        const status = dto.status ?? PageStatus.DRAFT;
        const page = this.pagesRepository.create({
            ...dto,
            status,
            publishedAt: status === PageStatus.PUBLISHED ? new Date() : null,
        });
        return this.pagesRepository.save(page);
    }

    async findAll(query: QueryPageDto): Promise<PaginatedResult<Page>> {
        const page = await this.pagesRepository.search(query);
        return new PaginatedResult(page.items, page.total, query.page, query.limit);
    }

    async findOne(id: string): Promise<Page> {
        const page = await this.pagesRepository.findById(id);
        if (!page) throw new NotFoundException(`Không tìm thấy trang với id ${id}`);
        return page;
    }

    /** Storefront: trang nháp trả 404 như trang không tồn tại, không lộ ra là "có nhưng ẩn". */
    async findPublishedBySlug(slug: string): Promise<Page> {
        const page = await this.pagesRepository.findPublishedBySlug(slug);
        if (!page) throw new NotFoundException(`Không tìm thấy trang ${slug}`);
        return page;
    }

    async update(id: string, dto: UpdatePageDto): Promise<Page> {
        const page = await this.findOne(id);
        // Đổi title KHÔNG đổi slug (khác bài viết): URL trang tĩnh nằm trong footer
        // và link đã chia sẻ, tự đổi theo title là âm thầm làm gãy các link đó.
        if (dto.slug && dto.slug !== page.slug) await this.assertSlugAvailable(dto.slug, id);

        if (dto.status === PageStatus.PUBLISHED) page.publishedAt ??= new Date();
        Object.assign(page, dto);
        return this.pagesRepository.save(page);
    }

    async publish(id: string): Promise<Page> {
        const page = await this.findOne(id);
        if (page.status === PageStatus.PUBLISHED) return page;

        page.status = PageStatus.PUBLISHED;
        page.publishedAt ??= new Date();
        return this.pagesRepository.save(page);
    }

    async unpublish(id: string): Promise<Page> {
        const page = await this.findOne(id);
        page.status = PageStatus.DRAFT;
        return this.pagesRepository.save(page);
    }

    async remove(id: string): Promise<void> {
        await this.pagesRepository.softRemove(await this.findOne(id));
    }

    /**
     * Slug do người nhập chủ động nên trùng thì báo lỗi, không tự thêm hậu tố `-2`
     * như bài viết — trang `/privacy-2` không phải thứ admin muốn đưa vào footer.
     */
    private async assertSlugAvailable(slug: string, excludeId?: string): Promise<void> {
        if (RESERVED_PAGE_SLUGS.has(slug)) {
            throw new BadRequestException(
                `Đường dẫn "${slug}" trùng với một trang có sẵn của storefront, hãy chọn tên khác`,
            );
        }
        if ((await this.pagesRepository.countBySlug(slug, excludeId)) > 0) {
            throw new ConflictException(`Đã có trang dùng đường dẫn "${slug}"`);
        }
    }
}
