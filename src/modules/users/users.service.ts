import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Brackets, Repository } from 'typeorm';
import { PaginatedResult } from '../../common/dto/paginated-result.dto';
import { RoleCode } from '../../common/enums/role.enum';
import { resolveSortColumn } from '../../common/utils/query.util';
import { BCRYPT_SALT_ROUNDS } from '../../config/configuration';
import { TokenVersionStore } from '../auth/token-version/token-version.store';
import { RolesService } from '../rbac/roles.service';
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
    'status',
] as const;

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User) private readonly usersRepository: Repository<User>,
        private readonly rolesService: RolesService,
        private readonly tokenVersionStore: TokenVersionStore,
    ) {}

    hashPassword(plain: string): Promise<string> {
        return bcrypt.hash(plain, BCRYPT_SALT_ROUNDS);
    }

    comparePassword(plain: string, hashed: string): Promise<boolean> {
        return bcrypt.compare(plain, hashed);
    }

    async create(dto: CreateUserDto): Promise<User> {
        await this.assertUsernameAvailable(dto.username);
        if (dto.email) await this.assertEmailAvailable(dto.email);

        const { roleCode, ...rest } = dto;
        const role = await this.rolesService.findByCode(roleCode ?? RoleCode.CUSTOMER);

        const user = this.usersRepository.create({
            ...rest,
            password: await this.hashPassword(dto.password),
            // Gán cả quan hệ để response trả luôn `role`, không phải query lại
            roleId: role.id,
            role,
            status: dto.status ?? UserStatus.ACTIVE,
        });

        const saved = await this.usersRepository.save(user);
        // `password` có select:false nhưng vẫn nằm trong instance vừa save -> xoá thủ công
        delete (saved as Partial<User>).password;
        return saved;
    }

    async findAll(query: QueryUserDto): Promise<PaginatedResult<User>> {
        // `eager` không áp dụng cho QueryBuilder -> phải join tay để có role.code
        const qb = this.usersRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.role', 'role');

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
        if (query.roleCode) qb.andWhere('role.code = :roleCode', { roleCode: query.roleCode });
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

    /** Dùng cho luồng đăng nhập: kèm cột `password` (mặc định select:false) và role. */
    findByUsernameWithPassword(username: string): Promise<User | null> {
        return this.usersRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.role', 'role')
            .addSelect('user.password')
            .where('user.username = :username', { username: username.toLowerCase() })
            .getOne();
    }

    /** Dùng cho luồng đổi mật khẩu: kèm cột `password` (mặc định select:false). */
    findByIdWithPassword(id: string): Promise<User | null> {
        return this.usersRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.role', 'role')
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

    /**
     * Đổi vai trò của user.
     *
     * Role nằm trong JWT nên token đang cầm vẫn mang quyền cũ — thu hồi luôn
     * để việc hạ quyền có hiệu lực ngay; user phải đăng nhập lại.
     */
    async assignRole(id: string, roleCode: string): Promise<User> {
        const user = await this.findOne(id);
        const role = await this.rolesService.findByCode(roleCode);

        if (user.roleId === role.id) return user;

        user.roleId = role.id;
        user.role = role;
        const saved = await this.usersRepository.save(user);

        await this.tokenVersionStore.revoke(id);
        return saved;
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
