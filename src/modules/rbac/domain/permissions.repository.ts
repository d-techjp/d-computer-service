import type { RepositoryPage } from '../../../common/interfaces/repository-page.interface';
import type { QueryPermissionDto } from '../dto/query-permission.dto';
import type { Permission } from '../entities/permission.entity';

export abstract class PermissionsRepository {
    abstract create(data: Partial<Permission>): Permission;

    abstract save(permission: Permission): Promise<Permission>;

    abstract search(criteria: QueryPermissionDto): Promise<RepositoryPage<Permission>>;

    /** Toàn bộ permission, sắp theo module rồi code — dựng dropdown gom nhóm. */
    abstract findAllOrderedByModule(): Promise<Permission[]>;

    abstract findById(id: string): Promise<Permission | null>;

    abstract findByCodes(codes: string[]): Promise<Permission[]>;

    /** Xoá cứng — permission không soft-delete, xem lý do ở `PermissionsService.remove`. */
    abstract remove(permission: Permission): Promise<void>;

    abstract existsByCode(code: string): Promise<boolean>;
}
