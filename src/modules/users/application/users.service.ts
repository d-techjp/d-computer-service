import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import { RoleCode } from '../../../common/enums/role.enum';
import { BCRYPT_SALT_ROUNDS } from '../../../config/configuration';
import { TokenVersionStore } from '../../auth/token-version/token-version.store';
import { RolesService } from '../../rbac/roles.service';
import { UsersRepository } from '../domain/users.repository';
import type { CreateUserDto } from '../dto/create-user.dto';
import type { QueryUserDto } from '../dto/query-user.dto';
import type { UpdateUserDto } from '../dto/update-user.dto';
import { User, UserStatus } from '../entities/user.entity';

@Injectable()
export class UsersService {
    constructor(
        private readonly usersRepository: UsersRepository,
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
        const page = await this.usersRepository.search(query);
        return new PaginatedResult(page.items, page.total, query.page, query.limit);
    }

    async findOne(id: string): Promise<User> {
        const user = await this.usersRepository.findById(id);
        if (!user) throw new NotFoundException(`Không tìm thấy user với id ${id}`);
        return user;
    }

    /** Dùng cho luồng đăng nhập: kèm cột `password` (mặc định select:false) và role. */
    findByUsernameWithPassword(username: string): Promise<User | null> {
        return this.usersRepository.findByUsernameWithPassword(username);
    }

    /** Dùng cho luồng đổi mật khẩu: kèm cột `password` (mặc định select:false). */
    findByIdWithPassword(id: string): Promise<User | null> {
        return this.usersRepository.findByIdWithPassword(id);
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
        await this.usersRepository.updatePassword(id, hashedPassword);
    }

    async markLoggedIn(id: string): Promise<void> {
        await this.usersRepository.markLoggedIn(id);
    }

    private async assertUsernameAvailable(username: string): Promise<void> {
        if (await this.usersRepository.existsByUsername(username)) {
            throw new ConflictException(`Username ${username} đã được sử dụng`);
        }
    }

    private async assertEmailAvailable(email: string): Promise<void> {
        if (await this.usersRepository.existsByEmail(email)) {
            throw new ConflictException(`Email ${email} đã được sử dụng`);
        }
    }
}
