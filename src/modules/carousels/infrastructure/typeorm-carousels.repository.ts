import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import type { RepositoryPage } from '../../../common/interfaces/repository-page.interface';
import { resolveSortColumn } from '../../../common/utils/query.util';
import type { CarouselSortPosition } from '../domain/carousels.repository';
import { CarouselsRepository } from '../domain/carousels.repository';
import type { QueryCarouselDto } from '../dto/query-carousel.dto';
import { Carousel } from '../entities/carousel.entity';

const SORTABLE_COLUMNS = ['sortOrder', 'name', 'createdAt', 'updatedAt'] as const;

/** Adapter TypeORM/Postgres cho `CarouselsRepository`. */
@Injectable()
export class TypeOrmCarouselsRepository extends CarouselsRepository {
    constructor(@InjectRepository(Carousel) private readonly repo: Repository<Carousel>) {
        super();
    }

    create(data: Partial<Carousel>): Carousel {
        return this.repo.create(data);
    }

    save(carousel: Carousel): Promise<Carousel> {
        return this.repo.save(carousel);
    }

    async search(criteria: QueryCarouselDto): Promise<RepositoryPage<Carousel>> {
        const qb = this.repo.createQueryBuilder('carousel');

        if (criteria.search) {
            qb.andWhere('(carousel.name ILIKE :search OR carousel.slug ILIKE :search)', {
                search: `%${criteria.search}%`,
            });
        }
        if (criteria.isActive !== undefined) {
            qb.andWhere('carousel.isActive = :isActive', { isActive: criteria.isActive });
        }

        const sortBy = resolveSortColumn(criteria.sortBy, SORTABLE_COLUMNS, 'sortOrder');
        qb.orderBy(`carousel.${sortBy}`, criteria.sortOrder)
            .skip(criteria.skip)
            .take(criteria.limit);

        const [items, total] = await qb.getManyAndCount();
        return { items, total };
    }

    findActive(): Promise<Carousel[]> {
        // sortOrder trùng nhau là chuyện thường (mặc định 0) -> chốt thêm createdAt
        // để thứ tự trang chủ ổn định giữa các lần gọi.
        return this.repo.find({
            where: { isActive: true },
            order: { sortOrder: 'ASC', createdAt: 'DESC' },
        });
    }

    findById(id: string): Promise<Carousel | null> {
        return this.repo.findOne({ where: { id } });
    }

    findBySlug(slug: string): Promise<Carousel | null> {
        return this.repo.findOne({ where: { slug } });
    }

    async softRemove(carousel: Carousel): Promise<void> {
        await this.repo.softRemove(carousel);
    }

    countBySlug(slug: string, excludeId?: string): Promise<number> {
        return this.repo.count({
            where: excludeId ? { slug, id: Not(excludeId) } : { slug },
        });
    }

    countByIds(ids: string[]): Promise<number> {
        if (ids.length === 0) return Promise.resolve(0);
        return this.repo.count({ where: { id: In(ids) } });
    }

    async updateSortOrders(positions: CarouselSortPosition[]): Promise<void> {
        await this.repo.manager.transaction(async (manager) => {
            for (const { id, sortOrder } of positions) {
                await manager.update(Carousel, { id }, { sortOrder });
            }
        });
    }
}
