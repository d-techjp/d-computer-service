import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicatorService, type HealthIndicatorResult } from '@nestjs/terminus';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.constants';

@Injectable()
export class RedisHealthIndicator {
    constructor(
        @Inject(REDIS_CLIENT) private readonly redis: Redis,
        private readonly healthIndicatorService: HealthIndicatorService,
    ) {}

    /** PING kèm timeout: ioredis xếp lệnh vào hàng đợi khi mất kết nối nên phải tự chặn treo. */
    async pingCheck(key: string, timeoutMs = 3000): Promise<HealthIndicatorResult> {
        const indicator = this.healthIndicatorService.check(key);

        try {
            await Promise.race([
                this.redis.ping(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error(`Quá ${timeoutMs}ms`)), timeoutMs),
                ),
            ]);
            return indicator.up();
        } catch (error) {
            return indicator.down({
                message: error instanceof Error ? error.message : String(error),
            });
        }
    }
}
