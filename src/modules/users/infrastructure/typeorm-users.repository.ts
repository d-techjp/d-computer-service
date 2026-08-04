import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import type { RepositoryPage } from '../../../common/interfaces/repository-page.interface';
import { resolveSortColumn } from '../../../common/utils/query.util';
import { UsersRepository } from '../domain/users.repository';
import type { QueryUserDto } from '../dto/query-user.dto';
import { User } from '../entities/user.entity';

const SORTABLE_COLUMNS = [
    'createdAt',
    'updatedAt',
    'username',
    'email',
    'fullName',
    'status',
] as const;

@Injectable()
export class TypeOrmUsersRepository extends UsersRepository {
    constructor(@InjectRepository(User) private readonly repo: Repository<User>) {
        super();
    }

    create(data: Partial<User>): User {
        return this.repo.create(data);
    }

    save(user: User): Promise<User> {
        return this.repo.save(user);
    }

    async search(criteria: QueryUserDto): Promise<RepositoryPage<User>> {
        // `eager` không áp dụng cho QueryBuilder -> phải join tay để có role.code
        const qb = this.repo.createQueryBuilder('user').leftJoinAndSelect('user.role', 'role');

        if (criteria.search) {
            qb.andWhere(
                new Brackets((where) =>
                    where
                        .where('user.username ILIKE :search', { search: `%${criteria.search}%` })
                        .orWhere('user.email ILIKE :search', { search: `%${criteria.search}%` })
                        .orWhere('user.fullName ILIKE :search', { search: `%${criteria.search}%` })
                        .orWhere('user.phone ILIKE :search', { search: `%${criteria.search}%` }),
                ),
            );
        }
        if (criteria.roleCode?.length) {
            qb.andWhere('role.code IN (:...roleCodes)', { roleCodes: criteria.roleCode });
        }
        if (criteria.status) qb.andWhere('user.status = :status', { status: criteria.status });

        const sortBy = resolveSortColumn(criteria.sortBy, SORTABLE_COLUMNS, 'createdAt');
        qb.orderBy(`user.${sortBy}`, criteria.sortOrder).skip(criteria.skip).take(criteria.limit);

        const [items, total] = await qb.getManyAndCount();
        return { items, total };
    }

    findById(id: string): Promise<User | null> {
        return this.repo.findOne({ where: { id } });
    }

    findByUsernameWithPassword(username: string): Promise<User | null> {
        return this.repo
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.role', 'role')
            .addSelect('user.password')
            .where('user.username = :username', { username: username.toLowerCase() })
            .getOne();
    }

    findByIdWithPassword(id: string): Promise<User | null> {
        return this.repo
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.role', 'role')
            .addSelect('user.password')
            .where('user.id = :id', { id })
            .getOne();
    }

    async softRemove(user: User): Promise<void> {
        await this.repo.softRemove(user);
    }

    async updatePassword(id: string, hashedPassword: string): Promise<void> {
        await this.repo.update({ id }, { password: hashedPassword });
    }

    async markLoggedIn(id: string): Promise<void> {
        await this.repo.update({ id }, { lastLoginAt: new Date() });
    }

    existsByUsername(username: string): Promise<boolean> {
        return this.repo.exists({ where: { username: username.toLowerCase() }, withDeleted: true });
    }

    existsByEmail(email: string): Promise<boolean> {
        return this.repo.exists({ where: { email: email.toLowerCase() }, withDeleted: true });
    }
}
