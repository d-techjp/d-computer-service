import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { parseDurationToSeconds } from '../../../common/utils/duration.util';
import { REDIS_CLIENT, REDIS_KEY_PREFIX } from '../../../redis/redis.constants';
import { TokenVersionStore } from './token-version.store';

const KEY_NAMESPACE = 'token-version';

/**
 * Bản cài đặt trên Redis — thay cho TTL in-memory:
 * - Sống sót qua restart process (token đang cầm vẫn dùng được).
 * - Nhiều instance dùng chung một nguồn version, không cần sticky session.
 *
 * TTL của key lấy theo `JWT_EXPIRES_IN`: hết hạn token thì bản ghi version cũng
 * không còn ý nghĩa, để Redis tự dọn thay vì phải quét thủ công.
 */
@Injectable()
export class RedisTokenVersionStore extends TokenVersionStore {
    private readonly ttlSeconds: number;

    constructor(
        @Inject(REDIS_CLIENT) private readonly redis: Redis,
        configService: ConfigService,
    ) {
        super();
        this.ttlSeconds = parseDurationToSeconds(
            configService.get<string>('jwt.expiresIn', '1d'),
            86400,
        );
    }

    async get(userId: string): Promise<number | null> {
        const raw = await this.redis.get(this.key(userId));
        if (raw === null) return null;

        const version = Number.parseInt(raw, 10);
        return Number.isNaN(version) ? null : version;
    }

    /**
     * INCR tạo key với giá trị 1 nếu chưa tồn tại — đúng ngữ nghĩa "lần đăng nhập đầu".
     * Gộp cùng EXPIRE trong một pipeline để mỗi lần tăng đều làm mới TTL.
     */
    async increment(userId: string): Promise<number> {
        const key = this.key(userId);
        const results = await this.redis.multi().incr(key).expire(key, this.ttlSeconds).exec();

        const version = results?.[0]?.[1];
        if (typeof version !== 'number') {
            throw new Error('Không tăng được token version trên Redis');
        }
        return version;
    }

    async revoke(userId: string): Promise<void> {
        await this.redis.del(this.key(userId));
    }

    /** Đếm bằng SCAN (không dùng KEYS) để không chặn Redis khi số key lớn. */
    async size(): Promise<number> {
        // keyPrefix của client không tự áp vào SCAN MATCH -> phải ghép tay
        const pattern = `${REDIS_KEY_PREFIX}${KEY_NAMESPACE}:*`;
        let cursor = '0';
        let total = 0;

        do {
            const [nextCursor, keys] = await this.redis.scan(
                cursor,
                'MATCH',
                pattern,
                'COUNT',
                100,
            );
            cursor = nextCursor;
            total += keys.length;
        } while (cursor !== '0');

        return total;
    }

    private key(userId: string): string {
        return `${KEY_NAMESPACE}:${userId}`;
    }
}
