import type { RepositoryPage } from '../../../common/interfaces/repository-page.interface';
import type { QueryRoleDto } from '../dto/query-role.dto';
import type { Role } from '../entities/role.entity';

export abstract class RolesRepository {
    abstract create(data: Partial<Role>): Role;

    abstract save(role: Role): Promise<Role>;

    abstract search(criteria: QueryRoleDto): Promise<RepositoryPage<Role>>;

    /** Toàn bộ role, sắp theo tên — dựng dropdown chọn vai trò. */
    abstract findAllForOptions(): Promise<Role[]>;

    /** Kèm relation `permissions`. */
    abstract findById(id: string): Promise<Role | null>;

    /** Kèm relation `permissions`. */
    abstract findByCode(code: string): Promise<Role | null>;

    abstract softRemove(role: Role): Promise<void>;

    abstract existsByCode(code: string, includeSoftDeleted: boolean): Promise<boolean>;

    /**
     * Số user đang gán role này — cross-aggregate read (Role đọc sang bảng users).
     * Vẫn nằm sau interface này thay vì service tự query, nhưng lưu ý đây là ranh
     * giới "shared kernel" giữa 2 module dùng chung 1 DB, không phải domain thuần tuý.
     */
    abstract countUsersWithRole(roleId: string): Promise<number>;
}
