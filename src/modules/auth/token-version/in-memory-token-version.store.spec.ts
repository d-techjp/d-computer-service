import { InMemoryTokenVersionStore } from './in-memory-token-version.store';

// Store hardcode TTL 24h + chu kỳ dọn rác 5 phút (xem in-memory-token-version.store.ts)
const TTL_MS = 86_400_000;
const SWEEP_MS = 300_000;

describe('InMemoryTokenVersionStore', () => {
    const USER_ID = 'user-1';
    let store: InMemoryTokenVersionStore;

    beforeEach(() => {
        jest.useFakeTimers();
        store = new InMemoryTokenVersionStore();
        store.onModuleInit();
    });

    afterEach(() => {
        store.onModuleDestroy();
        jest.useRealTimers();
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

    it('bản ghi hết hạn sau TTL', async () => {
        await store.increment(USER_ID);
        jest.advanceTimersByTime(TTL_MS + 1_000);

        await expect(store.get(USER_ID)).resolves.toBeNull();
    });

    it('increment làm mới TTL', async () => {
        await store.increment(USER_ID);
        jest.advanceTimersByTime(TTL_MS - 1_000);

        await expect(store.increment(USER_ID)).resolves.toBe(2);
        jest.advanceTimersByTime(TTL_MS - 1_000);

        await expect(store.get(USER_ID)).resolves.toBe(2);
    });

    it('sweep dọn bản ghi hết hạn khỏi bộ nhớ', async () => {
        await store.increment('user-a');
        await store.increment('user-b');
        await expect(store.size()).resolves.toBe(2);

        jest.advanceTimersByTime(TTL_MS + SWEEP_MS);
        await expect(store.size()).resolves.toBe(0);
    });
});
