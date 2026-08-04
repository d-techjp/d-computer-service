import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { RepositoryPage } from '../../../common/interfaces/repository-page.interface';
import { resolveSortColumn } from '../../../common/utils/query.util';
// `User` chỉ dùng để đếm số user đang gán 1 role — 2 aggregate soi chung 1 DB,
// không phải RolesService phụ thuộc UsersService. Xem domain/roles.repository.ts.
import { User } from '../../users/entities/user.entity';
import { RolesRepository } from '../domain/roles.repository';
import type { QueryRoleDto } from '../dto/query-role.dto';
import { Role } from '../entities/role.entity';

const SORTABLE_COLUMNS = ['createdAt', 'updatedAt', 'code', 'name'] as const;

@Injectable()
export class TypeOrmRolesRepository extends RolesRepository {
    constructor(
        @InjectRepository(Role) private readonly repo: Repository<Role>,
        @InjectRepository(User) private readonly usersRepo: Repository<User>,
    ) {
        super();
    }

    create(data: Partial<Role>): Role {
        return this.repo.create(data);
    }

    save(role: Role): Promise<Role> {
        return this.repo.save(role);
    }

    async search(criteria: QueryRoleDto): Promise<RepositoryPage<Role>> {
        const qb = this.repo
            .createQueryBuilder('role')
            .leftJoinAndSelect('role.permissions', 'permission');

        if (criteria.search) {
            qb.andWhere('(role.code ILIKE :search OR role.name ILIKE :search)', {
                search: `%${criteria.search}%`,
            });
        }
        if (criteria.isSystem !== undefined) {
            qb.andWhere('role.isSystem = :isSystem', { isSystem: criteria.isSystem });
        }

        const sortBy = resolveSortColumn(criteria.sortBy, SORTABLE_COLUMNS, 'code');
        qb.orderBy(`role.${sortBy}`, criteria.sortOrder).skip(criteria.skip).take(criteria.limit);

        const [items, total] = await qb.getManyAndCount();
        return { items, total };
    }

    findAllForOptions(): Promise<Role[]> {
        return this.repo.find({ order: { name: 'ASC' } });
    }

    findById(id: string): Promise<Role | null> {
        return this.repo.findOne({ where: { id }, relations: { permissions: true } });
    }

    findByCode(code: string): Promise<Role | null> {
        return this.repo.findOne({ where: { code }, relations: { permissions: true } });
    }

    async softRemove(role: Role): Promise<void> {
        await this.repo.softRemove(role);
    }

    existsByCode(code: string, includeSoftDeleted: boolean): Promise<boolean> {
        return this.repo.exists({ where: { code }, withDeleted: includeSoftDeleted });
    }

    countUsersWithRole(roleId: string): Promise<number> {
        return this.usersRepo.count({ where: { roleId } });
    }
}
