import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import type { RepositoryPage } from '../../../common/interfaces/repository-page.interface';
import { resolveSortColumn } from '../../../common/utils/query.util';
import { ActivityLogsRepository } from '../domain/activity-logs.repository';
import type { CreateActivityLogDto } from '../dto/create-activity-log.dto';
import type { QueryActivityLogDto } from '../dto/query-activity-log.dto';
import { ActivityLog } from '../entities/activity-log.entity';

const SORTABLE_COLUMNS = ['createdAt', 'action', 'resource', 'status'] as const;

@Injectable()
export class TypeOrmActivityLogsRepository extends ActivityLogsRepository {
    constructor(@InjectRepository(ActivityLog) private readonly repo: Repository<ActivityLog>) {
        super();
    }

    create(data: CreateActivityLogDto): ActivityLog {
        return this.repo.create(data);
    }

    save(log: ActivityLog): Promise<ActivityLog> {
        return this.repo.save(log);
    }

    async search(criteria: QueryActivityLogDto): Promise<RepositoryPage<ActivityLog>> {
        const qb = this.repo
            .createQueryBuilder('log')
            .leftJoin('log.user', 'user')
            .addSelect(['user.id', 'user.email', 'user.fullName']);

        if (criteria.userId) qb.andWhere('log.userId = :userId', { userId: criteria.userId });
        if (criteria.action) qb.andWhere('log.action = :action', { action: criteria.action });
        if (criteria.resource) {
            qb.andWhere('log.resource = :resource', { resource: criteria.resource });
        }
        if (criteria.resourceId) {
            qb.andWhere('log.resourceId = :resourceId', { resourceId: criteria.resourceId });
        }
        if (criteria.status) qb.andWhere('log.status = :status', { status: criteria.status });
        if (criteria.search) {
            qb.andWhere('(log.description ILIKE :search OR log.path ILIKE :search)', {
                search: `%${criteria.search}%`,
            });
        }
        if (criteria.from && criteria.to) {
            qb.andWhere('log.createdAt BETWEEN :from AND :to', {
                from: criteria.from,
                to: criteria.to,
            });
        } else if (criteria.from) {
            qb.andWhere('log.createdAt >= :from', { from: criteria.from });
        } else if (criteria.to) {
            qb.andWhere('log.createdAt <= :to', { to: criteria.to });
        }

        const sortBy = resolveSortColumn(criteria.sortBy, SORTABLE_COLUMNS, 'createdAt');
        qb.orderBy(`log.${sortBy}`, criteria.sortOrder).skip(criteria.skip).take(criteria.limit);

        const [items, total] = await qb.getManyAndCount();
        return { items, total };
    }

    findById(id: string): Promise<ActivityLog | null> {
        return this.repo.findOne({ where: { id }, relations: { user: true } });
    }

    findByUser(userId: string, limit: number): Promise<ActivityLog[]> {
        return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' }, take: limit });
    }

    async deleteOlderThan(threshold: Date): Promise<number> {
        const result = await this.repo.delete({ createdAt: LessThan(threshold) });
        return result.affected ?? 0;
    }

    countByUserAction(userId: string, action: string, since: Date): Promise<number> {
        return this.repo.count({ where: { userId, action, createdAt: MoreThanOrEqual(since) } });
    }

    async statsByAction(from: Date, to: Date): Promise<Array<{ action: string; total: number }>> {
        const rows = await this.repo
            .createQueryBuilder('log')
            .select('log.action', 'action')
            .addSelect('COUNT(*)', 'total')
            .where('log.createdAt BETWEEN :from AND :to', { from, to })
            .groupBy('log.action')
            .orderBy('total', 'DESC')
            .getRawMany<{ action: string; total: string }>();

        return rows.map((row) => ({ action: row.action, total: Number(row.total) }));
    }
}
