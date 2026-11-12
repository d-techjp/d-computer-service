import {
    ConflictException,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { RoleCode } from '../../../common/enums/role.enum';
import { UsersRepository } from '../domain/users.repository';
import { User } from '../entities/user.entity';
import { UsersService } from './users.service';

export interface RegisterCustomerInput {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
}

export interface GoogleProfile {
    googleId: string;
    email: string;
    emailVerified: boolean;
    fullName: string;
    avatarUrl: string | null;
}

/**
 * Tài khoản do chính khách tạo trên storefront (form đăng ký, đăng nhập Google).
 * Tách khỏi `UsersService` vì đây là luồng của khách, còn `UsersService` là CRUD
 * dùng chung cho cả trang quản trị.
 */
@Injectable()
export class CustomerAccountsService {
    constructor(
        private readonly usersService: UsersService,
        private readonly usersRepository: UsersRepository,
    ) {}

    /** Khách không phải nghĩ username: sinh từ phần trước `@` của email. */
    async register(input: RegisterCustomerInput): Promise<User> {
        return this.usersService.create({
            username: await this.usersService.generateUniqueUsername(input.email.split('@')[0]),
            email: input.email,
            password: input.password,
            fullName: input.fullName,
            phone: input.phone,
            roleCode: RoleCode.CUSTOMER,
        });
    }

    /**
     * Tìm hoặc tạo tài khoản cho một danh tính Google đã được xác minh.
     *
     * Trùng email với tài khoản khách sẵn có thì liên kết vào đó (giữ lịch sử
     * đơn, kể cả khách tạo ở quầy POS), đồng thời ĐỔI mật khẩu sang giá trị ngẫu
     * nhiên: chưa có xác minh email, nên ai đó có thể đã đăng ký trước bằng email
     * của nạn nhân với mật khẩu họ biết; đổi mật khẩu cắt quyền của người đó.
     */
    async resolveGoogleUser(profile: GoogleProfile): Promise<{ user: User; created: boolean }> {
        const linked = await this.usersRepository.findByGoogleId(profile.googleId);
        if (linked) return { user: linked, created: false };

        // Email chưa xác minh ở phía Google thì không chứng minh được quyền sở hữu
        if (!profile.emailVerified) {
            throw new UnauthorizedException('Email của tài khoản Google chưa được xác minh');
        }

        const existing = await this.usersRepository.findByEmail(profile.email);
        if (existing) return { user: await this.linkExisting(existing, profile), created: false };

        const user = await this.usersService.create({
            username: await this.usersService.generateUniqueUsername(profile.email.split('@')[0]),
            email: profile.email,
            password: randomPassword(),
            fullName: profile.fullName,
            avatarUrl: profile.avatarUrl ?? undefined,
            roleCode: RoleCode.CUSTOMER,
        });
        await this.usersRepository.linkGoogle(user.id, profile.googleId, await this.randomHash());
        user.googleId = profile.googleId;
        return { user, created: true };
    }

    private async linkExisting(user: User, profile: GoogleProfile): Promise<User> {
        // Tài khoản nhân viên đăng nhập trang quản trị bằng mật khẩu — đổi mật khẩu
        // ở đây sẽ khoá họ khỏi admin, nên không bao giờ liên kết.
        if (user.role?.code !== (RoleCode.CUSTOMER as string)) {
            throw new ForbiddenException(
                'Email này thuộc tài khoản nội bộ, vui lòng đăng nhập bằng mật khẩu',
            );
        }
        if (user.googleId && user.googleId !== profile.googleId) {
            throw new ConflictException('Email này đã liên kết với một tài khoản Google khác');
        }

        await this.usersRepository.linkGoogle(user.id, profile.googleId, await this.randomHash());
        user.googleId = profile.googleId;
        return user;
    }

    private randomHash(): Promise<string> {
        return this.usersService.hashPassword(randomPassword());
    }
}

function randomPassword(): string {
    return randomBytes(24).toString('base64url');
}
