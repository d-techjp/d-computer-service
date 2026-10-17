import type { RepositoryPage } from '../../../common/interfaces/repository-page.interface';
import type { QueryUserDto } from '../dto/query-user.dto';
import type { User } from '../entities/user.entity';

export abstract class UsersRepository {
    abstract create(data: Partial<User>): User;

    abstract save(user: User): Promise<User>;

    abstract search(criteria: QueryUserDto): Promise<RepositoryPage<User>>;

    abstract findById(id: string): Promise<User | null>;

    /** Kèm cột `password` (mặc định `select: false`) — dùng cho luồng đăng nhập. */
    abstract findByUsernameWithPassword(username: string): Promise<User | null>;

    /** Kèm cột `password` — dùng cho luồng đổi mật khẩu. */
    abstract findByIdWithPassword(id: string): Promise<User | null>;

    abstract softRemove(user: User): Promise<void>;

    abstract updatePassword(id: string, hashedPassword: string): Promise<void>;

    abstract markLoggedIn(id: string): Promise<void>;

    /** Bao gồm cả bản ghi đã soft-delete — username/email là định danh vĩnh viễn. */
    abstract existsByUsername(username: string): Promise<boolean>;

    abstract existsByEmail(email: string): Promise<boolean>;

    /**
     * Khách hàng (đúng `roleCode`) có số điện thoại chứa dãy số `digits` — so
     * khớp sau khi bỏ mọi ký tự không phải số, để `090-1234-5678` và
     * `09012345678` là một.
     */
    abstract searchByPhoneDigits(digits: string, roleCode: string, limit: number): Promise<User[]>;

    /** Khớp CHÍNH XÁC dãy số điện thoại (sau khi bỏ ký tự không phải số). */
    abstract findByPhoneDigits(digits: string, roleCode: string): Promise<User | null>;
}
