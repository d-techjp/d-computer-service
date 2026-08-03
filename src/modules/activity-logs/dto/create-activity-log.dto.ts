import type { ActivityStatus } from '../enums/activity-action.enum';

/** DTO nội bộ (service-to-service), không expose qua HTTP nên không cần class-validator. */
export interface CreateActivityLogDto {
    userId?: string | null;
    userEmail?: string | null;
    action: string;
    resource: string;
    resourceId?: string | null;
    status?: ActivityStatus;
    description?: string | null;
    method?: string | null;
    path?: string | null;
    statusCode?: number | null;
    durationMs?: number | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown> | null;
}
