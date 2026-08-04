import type { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { REDIS_KEY_PREFIX } from '../../../redis/redis.constants';
import { RedisTokenVersionStore } from './redis-token-version.store';

/**
 * Fake Redis tối giản, chỉ cài các lệnh store dùng tới — đủ để kiểm tra ngữ nghĩa
 * (INCR tạo key = 1, EXPIRE làm mới TTL, SCAN ghép prefix) mà không cần Redis thật.
 * Lưu ý: `keyPrefix` được ioredis áp ngầm nên fake cũng phải tự ghép vào key.
 */
class FakeRedis {
    readonly store = new Map<string, string>();
    readonly ttls = new Map<string, number>();

    get(key: string): Promise<string | null> {
        return Promise.resolve(this.store.get(this.prefixed(key)) ?? null);
    }

    del(key: string): Promise<number> {
        const full = this.prefixed(key);
        this.ttls.delete(full);
        return Promise.resolve(this.store.delete(full) ? 1 : 0);
    }

    multi(): {
        incr: (key: string) => ReturnType<FakeRedis['multi']>;
        expire: (key: string, seconds: number) => ReturnType<FakeRedis['multi']>;
        exec: () => Promise<[Error | null, unknown][]>;
    } {
        const results: [Error | null, unknown][] = [];

        const chain = {
            incr: (key: string) => {
                const full = this.prefixed(key);
                const next = Number.parseInt(this.store.get(full) ?? '0', 10) + 1;
                this.store.set(full, String(next));
                results.push([null, next]);
                return chain;
            },
            expire: (key: string, seconds: number) => {
                this.ttls.set(this.prefixed(key), seconds);
                results.push([null, 1]);
                return chain;
            },
            exec: () => Promise.resolve(results),
        };

        return chain;
    }

    /** Chỉ hỗ trợ pattern dạng `prefix*` — đủ cho cách store gọi SCAN. */
    scan(
        _cursor: string,
        _match: 'MATCH',
        pattern: string,
        _count: 'COUNT',
        _size: number,
    ): Promise<[string, string[]]> {
        const prefix = pattern.replace(/\*$/, '');
        const keys = [...this.store.keys()].filter((key) => key.startsWith(prefix));
        return Promise.resolve(['0', keys]);
    }

    private prefixed(key: string): string {
        return `${REDIS_KEY_PREFIX}${key}`;
    }
}

const configServiceStub = (expiresIn = '1d'): ConfigService =>
    ({ get: () => expiresIn }) as unknown as ConfigService;

describe('RedisTokenVersionStore', () => {
    const USER_ID = 'user-1';
    let redis: FakeRedis;
    let store: RedisTokenVersionStore;

    beforeEach(() => {
        redis = new FakeRedis();
        store = new RedisTokenVersionStore(redis as unknown as Redis, configServiceStub());
    });

    it('trả null khi user chưa từng đăng nhập', async () => {
        await expect(store.get(USER_ID)).resolves.toBeNull();
    });

    it('increment bắt đầu từ 1 và tăng dần', async () => {
        await expect(store.increment(USER_ID)).resolves.toBe(1);
        await expect(store.increment(USER_ID)).resolves.toBe(2);
        await expect(store.get(USER_ID)).resolves.toBe(2);
    });

    it('mỗi user có version độc lập', async () => {
        await store.increment('user-a');
        await store.increment('user-a');
        await store.increment('user-b');

        await expect(store.get('user-a')).resolves.toBe(2);
        await expect(store.get('user-b')).resolves.toBe(1);
    });

    it('revoke xoá bản ghi, lần increment sau quay lại 1', async () => {
        await store.increment(USER_ID);
        await store.increment(USER_ID);
        await store.revoke(USER_ID);

        await expect(store.get(USER_ID)).resolves.toBeNull();
        await expect(store.increment(USER_ID)).resolves.toBe(1);
    });

    it('mỗi lần increment đều đặt lại TTL theo JWT_EXPIRES_IN', async () => {
        await store.increment(USER_ID);
        expect(redis.ttls.get(`${REDIS_KEY_PREFIX}token-version:${USER_ID}`)).toBe(86400);
    });

    it('TTL lấy từ cấu hình jwt.expiresIn', async () => {
        const shortLived = new RedisTokenVersionStore(
            redis as unknown as Redis,
            configServiceStub('15m'),
        );
        await shortLived.increment(USER_ID);

        expect(redis.ttls.get(`${REDIS_KEY_PREFIX}token-version:${USER_ID}`)).toBe(900);
    });

    it('key được đặt trong namespace riêng, có prefix của service', async () => {
        await store.increment(USER_ID);
        expect([...redis.store.keys()]).toEqual([`${REDIS_KEY_PREFIX}token-version:${USER_ID}`]);
    });

    it('size đếm số user đang có phiên', async () => {
        await store.increment('user-a');
        await store.increment('user-b');

        await expect(store.size()).resolves.toBe(2);
    });
});
