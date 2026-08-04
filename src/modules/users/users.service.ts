import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Brackets, Repository } from 'typeorm';
import { PaginatedResult } from '../../common/dto/paginated-result.dto';
import { Role } from '../../common/enums/role.enum';
import { resolveSortColumn } from '../../common/utils/query.util';
import { BCRYPT_SALT_ROUNDS } from '../../config/configuration';
import type { CreateUserDto } from './dto/create-user.dto';
import type { QueryUserDto } from './dto/query-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import { User, UserStatus } from './entities/user.entity';

const SORTABLE_COLUMNS = [
    'createdAt',
    'updatedAt',
    'username',
    'email',
    'fullName',
    'role',
    'status',
] as const;

@Injectable()
export class UsersService {
    constructor(@InjectRepository(User) private readonly usersRepository: Repository<User>) {}

    hashPassword(plain: string): Promise<string> {
        return bcrypt.hash(plain, BCRYPT_SALT_ROUNDS);
    }

    comparePassword(plain: string, hashed: string): Promise<boolean> {
        return bcrypt.compare(plain, hashed);
    }

    async create(dto: CreateUserDto): Promise<User> {
        await this.assertUsernameAvailable(dto.username);
        if (dto.email) await this.assertEmailAvailable(dto.email);

        const user = this.usersRepository.create({
            ...dto,
            password: await this.hashPassword(dto.password),
            role: dto.role ?? Role.CUSTOMER,
            status: dto.status ?? UserStatus.ACTIVE,
        });

        const saved = await this.usersRepository.save(user);
        // `password` có select:false nhưng vẫn nằm trong instance vừa save -> xoá thủ công
        delete (saved as Partial<User>).password;
        return saved;
    }

    async findAll(query: QueryUserDto): Promise<PaginatedResult<User>> {
        const qb = this.usersRepository.createQueryBuilder('user');

        if (query.search) {
            qb.andWhere(
                new Brackets((where) =>
                    where
                        .where('user.username ILIKE :search', { search: `%${query.search}%` })
                        .orWhere('user.email ILIKE :search', { search: `%${query.search}%` })
                        .orWhere('user.fullName ILIKE :search', { search: `%${query.search}%` })
                        .orWhere('user.phone ILIKE :search', { search: `%${query.search}%` }),
                ),
            );
        }
        if (query.role) qb.andWhere('user.role = :role', { role: query.role });
        if (query.status) qb.andWhere('user.status = :status', { status: query.status });

        const sortBy = resolveSortColumn(query.sortBy, SORTABLE_COLUMNS, 'createdAt');
        qb.orderBy(`user.${sortBy}`, query.sortOrder).skip(query.skip).take(query.limit);

        const [items, total] = await qb.getManyAndCount();
        return new PaginatedResult(items, total, query.page, query.limit);
    }

    async findOne(id: string): Promise<User> {
        const user = await this.usersRepository.findOne({ where: { id } });
        if (!user) throw new NotFoundException(`Không tìm thấy user với id ${id}`);
        return user;
    }

    /** Dùng cho luồng đăng nhập: kèm cột `password` (mặc định select:false). */
    findByUsernameWithPassword(username: string): Promise<User | null> {
        return this.usersRepository
            .createQueryBuilder('user')
            .addSelect('user.password')
            .where('user.username = :username', { username: username.toLowerCase() })
            .getOne();
    }

    /** Dùng cho luồng đổi mật khẩu: kèm cột `password` (mặc định select:false). */
    findByIdWithPassword(id: string): Promise<User | null> {
        return this.usersRepository
            .createQueryBuilder('user')
            .addSelect('user.password')
            .where('user.id = :id', { id })
            .getOne();
    }

    async update(id: string, dto: UpdateUserDto): Promise<User> {
        const user = await this.findOne(id);
        if (dto.username && dto.username !== user.username) {
            await this.assertUsernameAvailable(dto.username);
        }
        if (dto.email && dto.email !== user.email) await this.assertEmailAvailable(dto.email);

        Object.assign(user, dto);
        return this.usersRepository.save(user);
    }

    async remove(id: string): Promise<void> {
        const user = await this.findOne(id);
        await this.usersRepository.softRemove(user);
    }

    async updatePassword(id: string, hashedPassword: string): Promise<void> {
        await this.usersRepository.update({ id }, { password: hashedPassword });
    }

    async markLoggedIn(id: string): Promise<void> {
        await this.usersRepository.update({ id }, { lastLoginAt: new Date() });
    }

    private async assertUsernameAvailable(username: string): Promise<void> {
        const existing = await this.usersRepository.findOne({
            where: { username: username.toLowerCase() },
            withDeleted: true,
        });
        if (existing) throw new ConflictException(`Username ${username} đã được sử dụng`);
    }

    private async assertEmailAvailable(email: string): Promise<void> {
        const existing = await this.usersRepository.findOne({
            where: { email: email.toLowerCase() },
            withDeleted: true,
        });
        if (existing) throw new ConflictException(`Email ${email} đã được sử dụng`);
    }
}
