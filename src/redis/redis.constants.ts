/** DI token cho ioredis client dùng chung toàn app. */
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

/** Tiền tố mọi key của service — tránh đụng key khi dùng chung Redis với app khác. */
export const REDIS_KEY_PREFIX = 'd-computer-service:';

export interface RedisConfig {
    host: string;
    port: number;
}
