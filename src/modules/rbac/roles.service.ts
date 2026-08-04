import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResult } from '../../common/dto/paginated-result.dto';
import { resolveSortColumn } from '../../common/utils/query.util';
import { User } from '../users/entities/user.entity';
import type { AssignPermissionsDto } from './dto/assign-permissions.dto';
import type { CreateRoleDto } from './dto/create-role.dto';
import type { RoleOptionDto } from './dto/option.dto';
import type { QueryRoleDto } from './dto/query-role.dto';
import type { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './entities/role.entity';
import { PermissionsService } from './permissions.service';
import { UserPermissionsService } from './user-permissions.service';

const SORTABLE_COLUMNS = ['createdAt', 'updatedAt', 'code', 'name'] as const;

@Injectable()
export class RolesService {
    constructor(
        @InjectRepository(Role) private readonly rolesRepository: Repository<Role>,
        @InjectRepository(User) private readonly usersRepository: Repository<User>,
        private readonly permissionsService: PermissionsService,
        private readonly userPermissionsService: UserPermissionsService,
    ) {}

    async create(dto: CreateRoleDto): Promise<Role> {
        await this.assertCodeAvailable(dto.code);

        const role = this.rolesRepository.create({
            code: dto.code,
            name: dto.name,
            description: dto.description ?? null,
            isSystem: false,
            permissions: await this.permissionsService.findByCodes(dto.permissionCodes ?? []),
        });

        return this.rolesRepository.save(role);
    }

    async findAll(query: QueryRoleDto): Promise<PaginatedResult<Role>> {
        const qb = this.rolesRepository
            .createQueryBuilder('role')
            .leftJoinAndSelect('role.permissions', 'permission');

        if (query.search) {
            qb.andWhere('(role.code ILIKE :search OR role.name ILIKE :search)', {
                search: `%${query.search}%`,
            });
        }
        if (query.isSystem !== undefined) {
            qb.andWhere('role.isSystem = :isSystem', { isSystem: query.isSystem });
        }

        const sortBy = resolveSortColumn(query.sortBy, SORTABLE_COLUMNS, 'code');
        qb.orderBy(`role.${sortBy}`, query.sortOrder).skip(query.skip).take(query.limit);

        const [items, total] = await qb.getManyAndCount();
        return new PaginatedResult(items, total, query.page, query.limit);
    }

    /** Bản rút gọn cho dropdown chọn vai trò khi tạo/sửa user. */
    async findOptions(): Promise<RoleOptionDto[]> {
        const roles = await this.rolesRepository.find({ order: { name: 'ASC' } });
        return roles.map((role) => ({
            id: role.id,
            code: role.code,
            name: role.name,
            isSystem: role.isSystem,
        }));
    }

    async findOne(id: string): Promise<Role> {
        const role = await this.rolesRepository.findOne({
            where: { id },
            relations: { permissions: true },
        });
        if (!role) throw new NotFoundException(`Không tìm thấy vai trò với id ${id}`);
        return role;
    }

    async findByCode(code: string): Promise<Role> {
        const role = await this.rolesRepository.findOne({
            where: { code },
            relations: { permissions: true },
        });
        if (!role) throw new NotFoundException(`Không tìm thấy vai trò với code ${code}`);
        return role;
    }

    async update(id: string, dto: UpdateRoleDto): Promise<Role> {
        const role = await this.findOne(id);

        if (dto.name !== undefined) role.name = dto.name;
        if (dto.description !== undefined) role.description = dto.description;
        if (dto.permissionCodes) {
            role.permissions = await this.permissionsService.findByCodes(dto.permissionCodes);
        }

        const saved = await this.rolesRepository.save(role);
        await this.userPermissionsService.invalidate(role.code);
        return saved;
    }

    /** Ghi đè toàn bộ permission của role bằng danh sách gửi lên. */
    async setPermissions(id: string, dto: AssignPermissionsDto): Promise<Role> {
        const role = await this.findOne(id);
        role.permissions = await this.permissionsService.findByCodes(dto.permissionCodes);

        const saved = await this.rolesRepository.save(role);
        await this.userPermissionsService.invalidate(role.code);
        return saved;
    }

    async remove(id: string): Promise<void> {
        const role = await this.findOne(id);

        if (role.isSystem) {
            throw new BadRequestException(`Không thể xoá vai trò hệ thống ${role.code}`);
        }

        // users.role_id là FK RESTRICT — báo lỗi rõ ràng thay vì để Postgres ném 500
        const assigned = await this.usersRepository.count({ where: { roleId: id } });
        if (assigned > 0) {
            throw new BadRequestException(
                `Còn ${assigned} user đang dùng vai trò này — chuyển họ sang vai trò khác trước khi xoá`,
            );
        }

        await this.rolesRepository.softRemove(role);
        await this.userPermissionsService.invalidate(role.code);
    }

    private async assertCodeAvailable(code: string): Promise<void> {
        const exists = await this.rolesRepository.exists({ where: { code }, withDeleted: true });
        if (exists) throw new ConflictException(`Vai trò ${code} đã tồn tại`);
    }
}
