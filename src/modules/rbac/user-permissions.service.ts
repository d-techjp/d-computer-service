import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.constants';
import { RolesRepository } from './domain/roles.repository';

const CACHE_NAMESPACE = 'permissions:role';
/** Permission đổi không thường xuyên; TTL chỉ để dọn key của role đã xoá. */
const CACHE_TTL_SECONDS = 3600;

/**
 * Nguồn permission cho mỗi request. Guard gọi rất nhiều nên kết quả được cache
 * trên Redis theo *role* (không theo user): mọi user cùng role dùng chung một
 * entry, đổi quyền của role là toàn bộ user thuộc role đó có hiệu lực ngay.
 *
 * Key dùng `code` thay vì id (`permissions:role:admin`) để đọc thẳng trên
 * redis-cli là biết ngay của vai trò nào. `code` không cho sửa sau khi tạo và
 * unique kể cả với bản ghi đã xoá mềm, nên an toàn làm khoá cache.
 */
@Injectable()
export class UserPermissionsService {
    private readonly logger = new Logger(UserPermissionsService.name);

    constructor(
        private readonly rolesRepository: RolesRepository,
        @Inject(REDIS_CLIENT) private readonly redis: Redis,
    ) {}

    /** Danh sách permission code của một role. Trả mảng rỗng nếu role không còn tồn tại. */
    async getByRoleCode(roleCode: string): Promise<string[]> {
        const cached = await this.readCache(roleCode);
        if (cached) return cached;

        const role = await this.rolesRepository.findByCode(roleCode);
        const codes = role?.permissions.map((permission) => permission.code).sort() ?? [];

        await this.writeCache(roleCode, codes);
        return codes;
    }

    /** Gọi sau khi đổi permission của role / xoá role để lần đọc sau lấy dữ liệu mới. */
    async invalidate(roleCode: string): Promise<void> {
        await this.redis.del(this.key(roleCode));
    }

    private async readCache(roleCode: string): Promise<string[] | null> {
        try {
            const raw = await this.redis.get(this.key(roleCode));
            if (raw === null) return null;

            const parsed: unknown = JSON.parse(raw);
            return Array.isArray(parsed) ? (parsed as string[]) : null;
        } catch (error) {
            // Redis lỗi không được làm sập việc phân quyền — bỏ cache, đọc thẳng DB
            this.logger.warn(`Không đọc được cache permission: ${this.describe(error)}`);
            return null;
        }
    }

    private async writeCache(roleCode: string, codes: string[]): Promise<void> {
        try {
            await this.redis.set(
                this.key(roleCode),
                JSON.stringify(codes),
                'EX',
                CACHE_TTL_SECONDS,
            );
        } catch (error) {
            this.logger.warn(`Không ghi được cache permission: ${this.describe(error)}`);
        }
    }

    private key(roleCode: string): string {
        return `${CACHE_NAMESPACE}:${roleCode}`;
    }

    private describe(error: unknown): string {
        return error instanceof Error ? error.message : String(error);
    }
}
