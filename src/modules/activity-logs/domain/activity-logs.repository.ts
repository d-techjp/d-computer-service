import type { RepositoryPage } from '../../../common/interfaces/repository-page.interface';
import type { CreateActivityLogDto } from '../dto/create-activity-log.dto';
import type { QueryActivityLogDto } from '../dto/query-activity-log.dto';
import type { ActivityLog } from '../entities/activity-log.entity';

export abstract class ActivityLogsRepository {
    abstract create(data: CreateActivityLogDto): ActivityLog;

    abstract save(log: ActivityLog): Promise<ActivityLog>;

    abstract search(criteria: QueryActivityLogDto): Promise<RepositoryPage<ActivityLog>>;

    abstract findById(id: string): Promise<ActivityLog | null>;

    abstract findByUser(userId: string, limit: number): Promise<ActivityLog[]>;

    abstract deleteOlderThan(threshold: Date): Promise<number>;

    abstract countByUserAction(userId: string, action: string, since: Date): Promise<number>;

    abstract statsByAction(from: Date, to: Date): Promise<Array<{ action: string; total: number }>>;
}
