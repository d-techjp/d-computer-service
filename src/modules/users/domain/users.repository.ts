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
}
