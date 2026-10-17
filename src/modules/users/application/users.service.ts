import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
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

    /** Gợi ý khách theo số điện thoại (màn bán tại quầy). Dưới 3 chữ số thì không tìm. */
    async searchCustomersByPhone(phone: string, limit = 10): Promise<User[]> {
        const digits = toPhoneDigits(phone);
        if (digits.length < 3) return [];
        return this.usersRepository.searchByPhoneDigits(digits, RoleCode.CUSTOMER, limit);
    }

    async findCustomer(id: string): Promise<User> {
        const user = await this.findOne(id);
        if (user.role?.code !== (RoleCode.CUSTOMER as string)) {
            throw new NotFoundException(`Không tìm thấy khách hàng với id ${id}`);
        }
        return user;
    }

    /**
     * Khách mua tại quầy có số điện thoại: dùng lại tài khoản khách trùng số, chưa
     * có thì tạo mới. Tài khoản tạo ở đây mang mật khẩu ngẫu nhiên không ai biết —
     * khách muốn đăng nhập web thì dùng "quên mật khẩu" (cần có email).
     *
     * Email đã thuộc tài khoản khác thì KHÔNG gắn vào khách mới (email là duy
     * nhất); đơn vẫn giữ email riêng để gửi biên nhận.
     */
    async findOrCreateCustomerByPhone(input: {
        phone: string;
        fullName?: string;
        email?: string;
    }): Promise<{ user: User; created: boolean }> {
        const digits = toPhoneDigits(input.phone);
        const existing = await this.usersRepository.findByPhoneDigits(digits, RoleCode.CUSTOMER);
        if (existing) return { user: existing, created: false };

        const email = input.email?.toLowerCase();
        const emailFree = email ? !(await this.usersRepository.existsByEmail(email)) : false;
        const user = await this.create({
            username: await this.generateCustomerUsername(digits),
            password: randomBytes(24).toString('base64url'),
            fullName: input.fullName?.trim() || input.phone,
            phone: input.phone.trim(),
            email: emailFree ? email : undefined,
            roleCode: RoleCode.CUSTOMER,
        });
        return { user, created: true };
    }

    /** `kh<số điện thoại>`, trùng (vd tài khoản cũ đã xoá) thì thêm hậu tố ngẫu nhiên. */
    private async generateCustomerUsername(digits: string): Promise<string> {
        const base = `kh${digits}`.slice(0, 40);
        if (!(await this.usersRepository.existsByUsername(base))) return base;
        for (let attempt = 0; attempt < 5; attempt += 1) {
            const candidate = `${base}_${randomBytes(3).toString('hex')}`;
            if (!(await this.usersRepository.existsByUsername(candidate))) return candidate;
        }
        throw new ConflictException('Không sinh được username cho khách mới, vui lòng thử lại');
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

function toPhoneDigits(phone: string): string {
    return phone.replace(/\D/g, '');
}
