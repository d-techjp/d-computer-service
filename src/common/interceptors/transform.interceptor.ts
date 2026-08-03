import {
    type CallHandler,
    type ExecutionContext,
    Injectable,
    type NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { map, type Observable } from 'rxjs';

export interface ApiResponse<T> {
    success: true;
    statusCode: number;
    data: T;
    timestamp: string;
}

/** Bọc mọi response thành công về cùng một khuôn dạng. */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
    intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
        const statusCode = context.switchToHttp().getResponse<Response>().statusCode;
        return next.handle().pipe(
            map((data) => ({
                success: true as const,
                statusCode,
                data,
                timestamp: new Date().toISOString(),
            })),
        );
    }
}
