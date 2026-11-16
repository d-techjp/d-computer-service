import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import type { RepositoryPage } from '../../../common/interfaces/repository-page.interface';
import { resolveSortColumn } from '../../../common/utils/query.util';
import { PagesRepository } from '../domain/pages.repository';
import type { QueryPageDto } from '../dto/query-page.dto';
import { Page, PageStatus } from '../entities/page.entity';

const SORTABLE_COLUMNS = ['createdAt', 'updatedAt', 'publishedAt', 'title', 'slug'] as const;

@Injectable()
export class TypeOrmPagesRepository extends PagesRepository {
    constructor(@InjectRepository(Page) private readonly repo: Repository<Page>) {
        super();
    }

    create(data: Partial<Page>): Page {
        return this.repo.create(data);
    }

    save(page: Page): Promise<Page> {
        return this.repo.save(page);
    }

    async search(criteria: QueryPageDto): Promise<RepositoryPage<Page>> {
        // Danh sách admin không cần nội dung HTML (có thể rất dài) — chỉ lấy cột hiển thị
        const qb = this.repo
            .createQueryBuilder('page')
            .select([
                'page.id',
                'page.title',
                'page.slug',
                'page.status',
                'page.publishedAt',
                'page.createdAt',
                'page.updatedAt',
            ]);

        if (criteria.search) {
            qb.andWhere('(page.title ILIKE :search OR page.slug ILIKE :search)', {
                search: `%${criteria.search}%`,
            });
        }
        if (criteria.status) qb.andWhere('page.status = :status', { status: criteria.status });

        const sortBy = resolveSortColumn(criteria.sortBy, SORTABLE_COLUMNS, 'updatedAt');
        qb.orderBy(`page.${sortBy}`, criteria.sortOrder).skip(criteria.skip).take(criteria.limit);

        const [items, total] = await qb.getManyAndCount();
        return { items, total };
    }

    findById(id: string): Promise<Page | null> {
        return this.repo.findOne({ where: { id } });
    }

    findPublishedBySlug(slug: string): Promise<Page | null> {
        return this.repo.findOne({ where: { slug, status: PageStatus.PUBLISHED } });
    }

    countBySlug(slug: string, excludeId?: string): Promise<number> {
        return this.repo.count({ where: excludeId ? { slug, id: Not(excludeId) } : { slug } });
    }

    async softRemove(page: Page): Promise<void> {
        await this.repo.softRemove(page);
    }
}
