import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { RepositoryPage } from '../../../common/interfaces/repository-page.interface';
import { resolveSortColumn } from '../../../common/utils/query.util';
import type { TiktokVideoSortPosition } from '../domain/tiktok-videos.repository';
import { TiktokVideosRepository } from '../domain/tiktok-videos.repository';
import type { QueryTiktokVideoDto } from '../dto/query-tiktok-video.dto';
import { TiktokVideo } from '../entities/tiktok-video.entity';

const SORTABLE_COLUMNS = ['sortOrder', 'createdAt', 'updatedAt'] as const;

/** Adapter TypeORM/Postgres cho `TiktokVideosRepository`. */
@Injectable()
export class TypeOrmTiktokVideosRepository extends TiktokVideosRepository {
    constructor(@InjectRepository(TiktokVideo) private readonly repo: Repository<TiktokVideo>) {
        super();
    }

    create(data: Partial<TiktokVideo>): TiktokVideo {
        return this.repo.create(data);
    }

    save(video: TiktokVideo): Promise<TiktokVideo> {
        return this.repo.save(video);
    }

    async search(criteria: QueryTiktokVideoDto): Promise<RepositoryPage<TiktokVideo>> {
        const qb = this.repo.createQueryBuilder('video');

        if (criteria.search) {
            qb.andWhere('(video.description ILIKE :search OR video.videoUrl ILIKE :search)', {
                search: `%${criteria.search}%`,
            });
        }
        if (criteria.isActive !== undefined) {
            qb.andWhere('video.isActive = :isActive', { isActive: criteria.isActive });
        }

        const sortBy = resolveSortColumn(criteria.sortBy, SORTABLE_COLUMNS, 'sortOrder');
        qb.orderBy(`video.${sortBy}`, criteria.sortOrder)
            // sortOrder trùng nhau là chuyện thường -> chốt thêm createdAt để thứ tự ổn định
            .addOrderBy('video.createdAt', 'DESC')
            .skip(criteria.skip)
            .take(criteria.limit);

        const [items, total] = await qb.getManyAndCount();
        return { items, total };
    }

    findActive(): Promise<TiktokVideo[]> {
        return this.repo.find({
            where: { isActive: true },
            order: { sortOrder: 'ASC', createdAt: 'DESC' },
        });
    }

    findById(id: string): Promise<TiktokVideo | null> {
        return this.repo.findOne({ where: { id } });
    }

    async softRemove(video: TiktokVideo): Promise<void> {
        await this.repo.softRemove(video);
    }

    countByIds(ids: string[]): Promise<number> {
        if (ids.length === 0) return Promise.resolve(0);
        return this.repo.count({ where: { id: In(ids) } });
    }

    async updateSortOrders(positions: TiktokVideoSortPosition[]): Promise<void> {
        await this.repo.manager.transaction(async (manager) => {
            for (const { id, sortOrder } of positions) {
                await manager.update(TiktokVideo, { id }, { sortOrder });
            }
        });
    }

    async findMaxSortOrder(): Promise<number> {
        const row = await this.repo
            .createQueryBuilder('video')
            .select('MAX(video.sortOrder)', 'max')
            .getRawOne<{ max: number | string | null }>();

        return row?.max === null || row?.max === undefined ? -1 : Number(row.max);
    }
}
