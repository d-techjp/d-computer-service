import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PaginatedResult } from '../../common/dto/paginated-result.dto';
import { ActivityLogsRepository } from './domain/activity-logs.repository';
import type { CreateActivityLogDto } from './dto/create-activity-log.dto';
import type { QueryActivityLogDto } from './dto/query-activity-log.dto';
import { ActivityLog } from './entities/activity-log.entity';
import { ActivityStatus } from './enums/activity-action.enum';

@Injectable()
export class ActivityLogsService {
    private readonly logger = new Logger(ActivityLogsService.name);

    constructor(private readonly activityLogsRepository: ActivityLogsRepository) {}

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
        const page = await this.activityLogsRepository.search(query);
        return new PaginatedResult(page.items, page.total, query.page, query.limit);
    }

    async findOne(id: string): Promise<ActivityLog> {
        const log = await this.activityLogsRepository.findById(id);
        if (!log) throw new NotFoundException(`Không tìm thấy activity log với id ${id}`);
        return log;
    }

    findByUser(userId: string, limit = 20): Promise<ActivityLog[]> {
        return this.activityLogsRepository.findByUser(userId, limit);
    }

    /** Dọn log cũ hơn `days` ngày. Gọi từ cron/job vận hành. */
    async purgeOlderThan(days: number): Promise<number> {
        const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        return this.activityLogsRepository.deleteOlderThan(threshold);
    }

    /** Đếm số lần một user thực hiện một action kể từ mốc thời gian (dùng cho rate-limit/audit). */
    countByUserAction(userId: string, action: string, since: Date): Promise<number> {
        return this.activityLogsRepository.countByUserAction(userId, action, since);
    }

    /** Thống kê số lượng log theo action trong khoảng thời gian. */
    statsByAction(from: Date, to: Date): Promise<Array<{ action: string; total: number }>> {
        return this.activityLogsRepository.statsByAction(from, to);
    }
}
