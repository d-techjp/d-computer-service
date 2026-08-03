import {
    type CallHandler,
    type ExecutionContext,
    Injectable,
    type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { catchError, tap, throwError, type Observable } from 'rxjs';
import { ActivityLogsService } from '../../modules/activity-logs/activity-logs.service';
import { ActivityStatus } from '../../modules/activity-logs/enums/activity-action.enum';
import {
    ACTIVITY_LOG_KEY,
    ACTIVITY_LOG_SKIP_KEY,
    type ActivityLogMetadata,
} from '../decorators/activity-log.decorator';
import type { RequestWithUser } from '../interfaces/authenticated-user.interface';

/** Field bị che khi lưu body vào metadata của log. */
const SENSITIVE_FIELDS = [
    'password',
    'currentPassword',
    'newPassword',
    'confirmPassword',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'authorization',
];

const MAX_METADATA_LENGTH = 4000;

/**
 * Tự động ghi activity log cho các handler được đánh dấu `@LogActivity(...)`.
 * Handler không có metadata sẽ được bỏ qua để tránh làm ngập bảng log.
 */
@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        private readonly activityLogsService: ActivityLogsService,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        if (context.getType() !== 'http') return next.handle();

        const skip = this.reflector.getAllAndOverride<boolean>(ACTIVITY_LOG_SKIP_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        const metadata = this.reflector.get<ActivityLogMetadata | undefined>(
            ACTIVITY_LOG_KEY,
            context.getHandler(),
        );
        if (skip || !metadata) return next.handle();

        const http = context.switchToHttp();
        const request = http.getRequest<RequestWithUser>();
        const startedAt = Date.now();

        return next.handle().pipe(
            tap((payload) => {
                void this.write(context, request, metadata, startedAt, ActivityStatus.SUCCESS, {
                    responseId: this.extractId(payload),
                });
            }),
            catchError((error: unknown) => {
                void this.write(context, request, metadata, startedAt, ActivityStatus.FAILED, {
                    error: error instanceof Error ? error.message : String(error),
                });
                return throwError(() => error);
            }),
        );
    }

    private write(
        context: ExecutionContext,
        request: RequestWithUser,
        metadata: ActivityLogMetadata,
        startedAt: number,
        status: ActivityStatus,
        extra: Record<string, unknown>,
    ): Promise<void> {
        const response = context.switchToHttp().getResponse<Response>();
        const params = request.params as Record<string, string> | undefined;
        const idParam = metadata.resourceIdParam ?? 'id';

        return this.activityLogsService.record({
            userId: request.user?.id ?? null,
            userEmail: request.user?.email ?? null,
            action: metadata.action,
            resource: metadata.resource,
            resourceId:
                params?.[idParam] ??
                (typeof extra.responseId === 'string' ? extra.responseId : null),
            status,
            description: metadata.description ?? null,
            method: request.method,
            path: request.originalUrl?.slice(0, 500) ?? null,
            statusCode: status === ActivityStatus.SUCCESS ? response.statusCode : null,
            durationMs: Date.now() - startedAt,
            ipAddress: this.resolveIp(request),
            userAgent: request.headers['user-agent']?.slice(0, 500) ?? null,
            metadata: this.buildMetadata(request, extra),
        });
    }

    private buildMetadata(
        request: RequestWithUser,
        extra: Record<string, unknown>,
    ): Record<string, unknown> | null {
        const body = this.mask(request.body);
        const payload: Record<string, unknown> = { ...extra };
        if (body && Object.keys(body).length > 0) payload.body = body;
        if (Object.keys(payload).length === 0) return null;

        const serialized = JSON.stringify(payload);
        if (serialized.length > MAX_METADATA_LENGTH) {
            return { truncated: true, preview: serialized.slice(0, MAX_METADATA_LENGTH) };
        }
        return payload;
    }

    /** Che đệ quy các field nhạy cảm trước khi lưu xuống DB. */
    private mask(value: unknown): Record<string, unknown> | null {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

        const result: Record<string, unknown> = {};
        for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
            if (SENSITIVE_FIELDS.includes(key)) {
                result[key] = '***';
            } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
                result[key] = this.mask(raw);
            } else {
                result[key] = raw;
            }
        }
        return result;
    }

    private resolveIp(request: RequestWithUser): string | null {
        const forwarded = request.headers['x-forwarded-for'];
        const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
        const ip = value?.split(',')[0]?.trim() ?? request.ip;
        return ip?.slice(0, 64) ?? null;
    }

    private extractId(payload: unknown): string | null {
        if (payload && typeof payload === 'object' && 'id' in payload) {
            const id = payload.id;
            return typeof id === 'string' ? id : null;
        }
        return null;
    }
}
