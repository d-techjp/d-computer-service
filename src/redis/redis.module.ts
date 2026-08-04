import { Global, Inject, Logger, Module, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT, REDIS_KEY_PREFIX, type RedisConfig } from './redis.constants';

/**
 * Client Redis dùng chung toàn app (@Global) — hiện phục vụ TokenVersionStore,
 * về sau dùng lại được cho cache / rate-limit mà không phải mở kết nối mới.
 *
 * ioredis tự retry nên app vẫn boot được khi Redis chưa sẵn sàng; `/health`
 * sẽ báo `redis: down` cho tới khi kết nối lại được.
 */
@Global()
@Module({
    providers: [
        {
            provide: REDIS_CLIENT,
            inject: [ConfigService],
            useFactory: (configService: ConfigService): Redis => {
                const logger = new Logger('Redis');
                const config = configService.getOrThrow<RedisConfig>('redis');

                const client = new Redis({
                    host: config.host,
                    port: config.port,
                    keyPrefix: REDIS_KEY_PREFIX,
                    enableOfflineQueue: true,
                    maxRetriesPerRequest: 3,
                    retryStrategy: (times) => Math.min(times * 200, 5000),
                });

                client.on('error', (error: Error) => logger.error(`Lỗi Redis: ${error.message}`));
                client.on('ready', () =>
                    logger.log(`Đã kết nối Redis ${config.host}:${config.port}`),
                );

                return client;
            },
        },
    ],
    exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
    constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

    /** Đóng kết nối để process thoát sạch (app.enableShutdownHooks trong main.ts). */
    async onApplicationShutdown(): Promise<void> {
        await this.client.quit();
    }
}
