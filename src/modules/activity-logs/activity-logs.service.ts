import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { PaginatedResult } from '../../common/dto/paginated-result.dto';
import { resolveSortColumn } from '../../common/utils/query.util';
import type { CreateActivityLogDto } from './dto/create-activity-log.dto';
import type { QueryActivityLogDto } from './dto/query-activity-log.dto';
import { ActivityLog } from './entities/activity-log.entity';
import { ActivityStatus } from './enums/activity-action.enum';

const SORTABLE_COLUMNS = ['createdAt', 'action', 'resource', 'status'] as const;

@Injectable()
export class ActivityLogsService {
    private readonly logger = new Logger(ActivityLogsService.name);

    constructor(
        @InjectRepository(ActivityLog)
        private readonly activityLogsRepository: Repository<ActivityLog>,
    ) {}

    /**
     * Ghi log và ném lỗi nếu thất bại. Dùng khi log là một phần bắt buộc của nghiệp vụ.
     * Trong luồng HTTP thông thường hãy dùng `record()`.
     */
    create(dto: CreateActivityLogDto): Promise<ActivityLog> {
        const entity = this.activityLogsRepository.create({
            ...dto,
            status: dto.status ?? ActivityStatus.SUCCESS,
        });
        return this.activityLogsRepository.save(entity);
    }

    /**
     * Ghi log "best-effort": lỗi khi ghi log không được làm hỏng request chính.
     */
    async record(dto: CreateActivityLogDto): Promise<void> {
        try {
            await this.create(dto);
        } catch (error) {
            this.logger.error(
                `Không ghi được activity log (${dto.action}/${dto.resource})`,
                error instanceof Error ? error.stack : String(error),
            );
        }
    }

    async findAll(query: QueryActivityLogDto): Promise<PaginatedResult<ActivityLog>> {
        const qb = this.activityLogsRepository
            .createQueryBuilder('log')
            .leftJoin('log.user', 'user')
            .addSelect(['user.id', 'user.email', 'user.fullName']);

        if (query.userId) qb.andWhere('log.userId = :userId', { userId: query.userId });
        if (query.action) qb.andWhere('log.action = :action', { action: query.action });
        if (query.resource) qb.andWhere('log.resource = :resource', { resource: query.resource });
        if (query.resourceId) {
            qb.andWhere('log.resourceId = :resourceId', { resourceId: query.resourceId });
        }
        if (query.status) qb.andWhere('log.status = :status', { status: query.status });
        if (query.search) {
            qb.andWhere('(log.description ILIKE :search OR log.path ILIKE :search)', {
                search: `%${query.search}%`,
            });
        }
        if (query.from && query.to) {
            qb.andWhere('log.createdAt BETWEEN :from AND :to', { from: query.from, to: query.to });
        } else if (query.from) {
            qb.andWhere('log.createdAt >= :from', { from: query.from });
        } else if (query.to) {
            qb.andWhere('log.createdAt <= :to', { to: query.to });
        }

        const sortBy = resolveSortColumn(query.sortBy, SORTABLE_COLUMNS, 'createdAt');
        qb.orderBy(`log.${sortBy}`, query.sortOrder).skip(query.skip).take(query.limit);

        const [items, total] = await qb.getManyAndCount();
        return new PaginatedResult(items, total, query.page, query.limit);
    }

    async findOne(id: string): Promise<ActivityLog> {
        const log = await this.activityLogsRepository.findOne({
            where: { id },
            relations: { user: true },
        });
        if (!log) throw new NotFoundException(`Không tìm thấy activity log với id ${id}`);
        return log;
    }

    findByUser(userId: string, limit = 20): Promise<ActivityLog[]> {
        return this.activityLogsRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }

    /** Dọn log cũ hơn `days` ngày. Gọi từ cron/job vận hành. */
    async purgeOlderThan(days: number): Promise<number> {
        const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const result = await this.activityLogsRepository.delete({
            createdAt: LessThan(threshold),
        });
        return result.affected ?? 0;
    }

    /** Đếm số lần một user thực hiện một action kể từ mốc thời gian (dùng cho rate-limit/audit). */
    countByUserAction(userId: string, action: string, since: Date): Promise<number> {
        return this.activityLogsRepository.count({
            where: { userId, action, createdAt: MoreThanOrEqual(since) },
        });
    }

    /** Thống kê số lượng log theo action trong khoảng thời gian. */
    async statsByAction(from: Date, to: Date): Promise<Array<{ action: string; total: number }>> {
        const rows = await this.activityLogsRepository
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
