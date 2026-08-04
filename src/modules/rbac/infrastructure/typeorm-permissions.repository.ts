import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { RepositoryPage } from '../../../common/interfaces/repository-page.interface';
import { resolveSortColumn } from '../../../common/utils/query.util';
import { PermissionsRepository } from '../domain/permissions.repository';
import type { QueryPermissionDto } from '../dto/query-permission.dto';
import { Permission } from '../entities/permission.entity';

const SORTABLE_COLUMNS = ['createdAt', 'updatedAt', 'code', 'name', 'module'] as const;

@Injectable()
export class TypeOrmPermissionsRepository extends PermissionsRepository {
    constructor(@InjectRepository(Permission) private readonly repo: Repository<Permission>) {
        super();
    }

    create(data: Partial<Permission>): Permission {
        return this.repo.create(data);
    }

    save(permission: Permission): Promise<Permission> {
        return this.repo.save(permission);
    }

    async search(criteria: QueryPermissionDto): Promise<RepositoryPage<Permission>> {
        const qb = this.repo.createQueryBuilder('permission');

        if (criteria.search) {
            qb.andWhere('(permission.code ILIKE :search OR permission.name ILIKE :search)', {
                search: `%${criteria.search}%`,
            });
        }
        if (criteria.module)
            qb.andWhere('permission.module = :module', { module: criteria.module });

        const sortBy = resolveSortColumn(criteria.sortBy, SORTABLE_COLUMNS, 'code');
        qb.orderBy(`permission.${sortBy}`, criteria.sortOrder)
            .skip(criteria.skip)
            .take(criteria.limit);

        const [items, total] = await qb.getManyAndCount();
        return { items, total };
    }

    findAllOrderedByModule(): Promise<Permission[]> {
        return this.repo.find({ order: { module: 'ASC', code: 'ASC' } });
    }

    findById(id: string): Promise<Permission | null> {
        return this.repo.findOne({ where: { id } });
    }

    findByCodes(codes: string[]): Promise<Permission[]> {
        if (codes.length === 0) return Promise.resolve([]);
        return this.repo.find({ where: { code: In(codes) } });
    }

    async remove(permission: Permission): Promise<void> {
        await this.repo.remove(permission);
    }

    existsByCode(code: string): Promise<boolean> {
        return this.repo.exists({ where: { code } });
    }
}
