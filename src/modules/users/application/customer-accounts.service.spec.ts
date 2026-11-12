import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { UsersRepository } from '../domain/users.repository';
import type { User } from '../entities/user.entity';
import { CustomerAccountsService, type GoogleProfile } from './customer-accounts.service';
import type { UsersService } from './users.service';

const profile: GoogleProfile = {
    googleId: 'google-sub-1',
    email: 'khach@example.com',
    emailVerified: true,
    fullName: 'Khách Hàng',
    avatarUrl: null,
};

const makeUser = (overrides: Partial<User> = {}): User =>
    ({
        id: 'user-1',
        email: profile.email,
        googleId: null,
        role: { code: 'customer' },
        ...overrides,
    }) as User;

describe('CustomerAccountsService.resolveGoogleUser', () => {
    let repo: jest.Mocked<Pick<UsersRepository, 'findByGoogleId' | 'findByEmail' | 'linkGoogle'>>;
    let usersService: jest.Mocked<
        Pick<UsersService, 'create' | 'generateUniqueUsername' | 'hashPassword'>
    >;
    let service: CustomerAccountsService;

    beforeEach(() => {
        repo = {
            findByGoogleId: jest.fn().mockResolvedValue(null),
            findByEmail: jest.fn().mockResolvedValue(null),
            linkGoogle: jest.fn().mockResolvedValue(undefined),
        };
        usersService = {
            create: jest.fn().mockResolvedValue(makeUser({ id: 'new-user' })),
            generateUniqueUsername: jest.fn().mockResolvedValue('khach'),
            hashPassword: jest.fn().mockResolvedValue('hashed'),
        };
        service = new CustomerAccountsService(
            usersService as unknown as UsersService,
            repo as unknown as UsersRepository,
        );
    });

    it('trả luôn tài khoản đã liên kết theo googleId', async () => {
        const linked = makeUser({ googleId: profile.googleId });
        repo.findByGoogleId.mockResolvedValue(linked);

        await expect(service.resolveGoogleUser(profile)).resolves.toEqual({
            user: linked,
            created: false,
        });
        expect(repo.linkGoogle).not.toHaveBeenCalled();
    });

    it('từ chối email Google chưa xác minh', async () => {
        await expect(
            service.resolveGoogleUser({ ...profile, emailVerified: false }),
        ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('liên kết vào tài khoản khách trùng email và đổi mật khẩu', async () => {
        repo.findByEmail.mockResolvedValue(makeUser());

        const { user, created } = await service.resolveGoogleUser(profile);

        expect(created).toBe(false);
        expect(user.googleId).toBe(profile.googleId);
        expect(repo.linkGoogle).toHaveBeenCalledWith('user-1', profile.googleId, 'hashed');
    });

    it('không bao giờ liên kết tài khoản nhân viên', async () => {
        repo.findByEmail.mockResolvedValue(makeUser({ role: { code: 'staff' } } as Partial<User>));

        await expect(service.resolveGoogleUser(profile)).rejects.toBeInstanceOf(ForbiddenException);
        expect(repo.linkGoogle).not.toHaveBeenCalled();
    });

    it('từ chối khi email đã gắn một tài khoản Google khác', async () => {
        repo.findByEmail.mockResolvedValue(makeUser({ googleId: 'google-sub-khac' }));

        await expect(service.resolveGoogleUser(profile)).rejects.toBeInstanceOf(ConflictException);
    });

    it('tạo tài khoản khách mới khi chưa có ai dùng email', async () => {
        const { user, created } = await service.resolveGoogleUser(profile);

        expect(created).toBe(true);
        expect(usersService.create).toHaveBeenCalledWith(
            expect.objectContaining({ email: profile.email, roleCode: 'customer' }),
        );
        expect(user.googleId).toBe(profile.googleId);
    });
});
