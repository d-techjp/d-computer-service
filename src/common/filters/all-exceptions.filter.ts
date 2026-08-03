import {
    type ArgumentsHost,
    Catch,
    type ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

interface ErrorBody {
    success: false;
    statusCode: number;
    message: string;
    errors?: unknown;
    path: string;
    method: string;
    timestamp: string;
}

/** Từ mức này trở lên là lỗi phía server -> log kèm stack trace. */
const SERVER_ERROR_THRESHOLD = 500;

/** Postgres error codes cần map sang HTTP status thân thiện. */
const PG_ERROR_MAP: Record<string, { status: number; message: string }> = {
    '23505': {
        status: HttpStatus.CONFLICT,
        message: 'Dữ liệu đã tồn tại (vi phạm ràng buộc duy nhất)',
    },
    '23503': { status: HttpStatus.BAD_REQUEST, message: 'Bản ghi tham chiếu không tồn tại' },
    '23502': { status: HttpStatus.BAD_REQUEST, message: 'Thiếu trường bắt buộc' },
    '22P02': { status: HttpStatus.BAD_REQUEST, message: 'Giá trị không đúng định dạng' },
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const { status, message, errors } = this.resolve(exception);

        const body: ErrorBody = {
            success: false,
            statusCode: status,
            message,
            ...(errors ? { errors } : {}),
            path: request.originalUrl,
            method: request.method,
            timestamp: new Date().toISOString(),
        };

        if (status >= SERVER_ERROR_THRESHOLD) {
            this.logger.error(
                `${request.method} ${request.originalUrl} -> ${status}: ${message}`,
                exception instanceof Error ? exception.stack : undefined,
            );
        } else {
            this.logger.warn(`${request.method} ${request.originalUrl} -> ${status}: ${message}`);
        }

        response.status(status).json(body);
    }

    private resolve(exception: unknown): { status: number; message: string; errors?: unknown } {
        if (exception instanceof HttpException) {
            const status = exception.getStatus();
            const payload = exception.getResponse();

            if (typeof payload === 'string') return { status, message: payload };

            const record = payload as { message?: string | string[]; error?: string };
            // ValidationPipe trả message dạng mảng -> tách sang `errors`, message giữ mô tả chung
            if (Array.isArray(record.message)) {
                return { status, message: 'Dữ liệu đầu vào không hợp lệ', errors: record.message };
            }
            return { status, message: record.message ?? exception.message };
        }

        if (exception instanceof QueryFailedError) {
            const code = (exception as QueryFailedError & { code?: string }).code;
            const mapped = code ? PG_ERROR_MAP[code] : undefined;
            if (mapped) return mapped;
            return {
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Lỗi truy vấn cơ sở dữ liệu',
            };
        }

        return {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            message: exception instanceof Error ? exception.message : 'Lỗi hệ thống không xác định',
        };
    }
}
