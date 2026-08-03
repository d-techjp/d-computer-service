import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { TokenVersionStore } from './token-version.store';

interface VersionEntry {
    version: number;
    /** epoch ms — sau mốc này bản ghi bị coi như không tồn tại */
    expiresAt: number;
}

/**
 * Bản cài đặt TTL in-memory.
 *
 * Giới hạn đã biết (chấp nhận ở giai đoạn đầu):
 * - Restart process => mất toàn bộ version => mọi token hiện hành bị từ chối.
 * - Chạy nhiều instance => mỗi instance một Map riêng => phải bật sticky session.
 * Khi lên production nhiều instance, thay bằng RedisTokenVersionStore.
 */
@Injectable()
export class InMemoryTokenVersionStore
    extends TokenVersionStore
    implements OnModuleInit, OnModuleDestroy
{
    private readonly logger = new Logger(InMemoryTokenVersionStore.name);
    private readonly store = new Map<string, VersionEntry>();
    private readonly ttlMs: number;
    private readonly sweepIntervalMs: number;
    private sweepTimer?: NodeJS.Timeout;

    constructor() {
        super();
        this.ttlMs = 86400 * 1000;
        this.sweepIntervalMs = 300 * 1000;
    }

    onModuleInit(): void {
        this.sweepTimer = setInterval(() => this.sweep(), this.sweepIntervalMs);
        // Không giữ event loop sống chỉ vì timer dọn rác
        this.sweepTimer.unref();
    }

    onModuleDestroy(): void {
        if (this.sweepTimer) clearInterval(this.sweepTimer);
        this.store.clear();
    }

    get(userId: string): Promise<number | null> {
        const entry = this.store.get(userId);
        if (!entry) return Promise.resolve(null);
        if (entry.expiresAt <= Date.now()) {
            this.store.delete(userId);
            return Promise.resolve(null);
        }
        return Promise.resolve(entry.version);
    }

    increment(userId: string): Promise<number> {
        const current = this.store.get(userId);
        const isAlive = current !== undefined && current.expiresAt > Date.now();
        const version = (isAlive ? current.version : 0) + 1;

        this.store.set(userId, { version, expiresAt: Date.now() + this.ttlMs });
        return Promise.resolve(version);
    }

    revoke(userId: string): Promise<void> {
        this.store.delete(userId);
        return Promise.resolve();
    }

    size(): Promise<number> {
        this.sweep();
        return Promise.resolve(this.store.size);
    }

    /** Xoá các bản ghi đã hết hạn để Map không phình vô hạn. */
    private sweep(): void {
        const now = Date.now();
        let removed = 0;
        for (const [userId, entry] of this.store) {
            if (entry.expiresAt <= now) {
                this.store.delete(userId);
                removed += 1;
            }
        }
        if (removed > 0) this.logger.debug(`Đã dọn ${removed} token version hết hạn`);
    }
}
