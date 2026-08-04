import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResult } from '../../common/dto/paginated-result.dto';
import { PermissionsRepository } from './domain/permissions.repository';
import type { CreatePermissionDto } from './dto/create-permission.dto';
import type { PermissionGroupOptionDto } from './dto/option.dto';
import type { QueryPermissionDto } from './dto/query-permission.dto';
import type { UpdatePermissionDto } from './dto/update-permission.dto';
import { Permission } from './entities/permission.entity';

@Injectable()
export class PermissionsService {
    constructor(private readonly permissionsRepository: PermissionsRepository) {}

    async create(dto: CreatePermissionDto): Promise<Permission> {
        await this.assertCodeAvailable(dto.code);
        return this.permissionsRepository.save(this.permissionsRepository.create(dto));
    }

    async findAll(query: QueryPermissionDto): Promise<PaginatedResult<Permission>> {
        const page = await this.permissionsRepository.search(query);
        return new PaginatedResult(page.items, page.total, query.page, query.limit);
    }

    /**
     * Bản rút gọn cho dropdown/checkbox khi gán quyền cho role: không phân trang,
     * không timestamps, gom sẵn theo module.
     */
    async findOptions(): Promise<PermissionGroupOptionDto[]> {
        const permissions = await this.permissionsRepository.findAllOrderedByModule();

        const grouped = new Map<string, PermissionGroupOptionDto>();
        for (const permission of permissions) {
            const group = grouped.get(permission.module) ?? {
                module: permission.module,
                permissions: [],
            };
            group.permissions.push({
                id: permission.id,
                code: permission.code,
                name: permission.name,
            });
            grouped.set(permission.module, group);
        }

        return [...grouped.values()];
    }

    async findOne(id: string): Promise<Permission> {
        const permission = await this.permissionsRepository.findById(id);
        if (!permission) throw new NotFoundException(`Không tìm thấy permission với id ${id}`);
        return permission;
    }

    async update(id: string, dto: UpdatePermissionDto): Promise<Permission> {
        const permission = await this.findOne(id);
        Object.assign(permission, dto);
        return this.permissionsRepository.save(permission);
    }

    async remove(id: string): Promise<void> {
        const permission = await this.findOne(id);
        // Xoá cứng: bản ghi còn lại sau soft-delete vẫn nằm trong role_permissions
        // và sẽ tiếp tục được tính là "có quyền".
        await this.permissionsRepository.remove(permission);
    }

    /** Đối chiếu danh sách code gửi lên với DB — thiếu code nào thì báo lỗi rõ code đó. */
    async findByCodes(codes: string[]): Promise<Permission[]> {
        if (codes.length === 0) return [];

        const permissions = await this.permissionsRepository.findByCodes(codes);
        if (permissions.length !== codes.length) {
            const found = new Set(permissions.map((permission) => permission.code));
            const missing = codes.filter((code) => !found.has(code));
            throw new NotFoundException(`Không tìm thấy permission: ${missing.join(', ')}`);
        }
        return permissions;
    }

    private async assertCodeAvailable(code: string): Promise<void> {
        const exists = await this.permissionsRepository.existsByCode(code);
        if (exists) throw new ConflictException(`Permission ${code} đã tồn tại`);
    }
}
