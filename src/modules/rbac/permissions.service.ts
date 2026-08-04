import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PaginatedResult } from '../../common/dto/paginated-result.dto';
import { resolveSortColumn } from '../../common/utils/query.util';
import type { CreatePermissionDto } from './dto/create-permission.dto';
import type { PermissionGroupOptionDto } from './dto/option.dto';
import type { QueryPermissionDto } from './dto/query-permission.dto';
import type { UpdatePermissionDto } from './dto/update-permission.dto';
import { Permission } from './entities/permission.entity';

const SORTABLE_COLUMNS = ['createdAt', 'updatedAt', 'code', 'name', 'module'] as const;

@Injectable()
export class PermissionsService {
    constructor(
        @InjectRepository(Permission)
        private readonly permissionsRepository: Repository<Permission>,
    ) {}

    async create(dto: CreatePermissionDto): Promise<Permission> {
        await this.assertCodeAvailable(dto.code);
        return this.permissionsRepository.save(this.permissionsRepository.create(dto));
    }

    async findAll(query: QueryPermissionDto): Promise<PaginatedResult<Permission>> {
        const qb = this.permissionsRepository.createQueryBuilder('permission');

        if (query.search) {
            qb.andWhere('(permission.code ILIKE :search OR permission.name ILIKE :search)', {
                search: `%${query.search}%`,
            });
        }
        if (query.module) qb.andWhere('permission.module = :module', { module: query.module });

        const sortBy = resolveSortColumn(query.sortBy, SORTABLE_COLUMNS, 'code');
        qb.orderBy(`permission.${sortBy}`, query.sortOrder).skip(query.skip).take(query.limit);

        const [items, total] = await qb.getManyAndCount();
        return new PaginatedResult(items, total, query.page, query.limit);
    }

    /**
     * Bản rút gọn cho dropdown/checkbox khi gán quyền cho role: không phân trang,
     * không timestamps, gom sẵn theo module.
     */
    async findOptions(): Promise<PermissionGroupOptionDto[]> {
        const permissions = await this.permissionsRepository.find({
            order: { module: 'ASC', code: 'ASC' },
        });

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
        const permission = await this.permissionsRepository.findOne({ where: { id } });
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

        const permissions = await this.permissionsRepository.find({ where: { code: In(codes) } });
        if (permissions.length !== codes.length) {
            const found = new Set(permissions.map((permission) => permission.code));
            const missing = codes.filter((code) => !found.has(code));
            throw new NotFoundException(`Không tìm thấy permission: ${missing.join(', ')}`);
        }
        return permissions;
    }

    private async assertCodeAvailable(code: string): Promise<void> {
        const exists = await this.permissionsRepository.exists({ where: { code } });
        if (exists) throw new ConflictException(`Permission ${code} đã tồn tại`);
    }
}
