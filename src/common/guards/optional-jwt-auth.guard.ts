import { type ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Auth "tuỳ chọn": có token hợp lệ thì gán `request.user`, không có (hoặc token
 * hỏng/hết hạn/đã thu hồi) thì vẫn cho đi tiếp như khách vãng lai.
 *
 * Cần thiết vì `@Public()` **tắt auth hoàn toàn**: `JwtAuthGuard.canActivate`
 * trả `true` sớm mà không gọi `super.canActivate()`, nên passport không chạy và
 * `request.user` luôn `undefined` kể cả khi client có gửi Bearer token. Giỏ hàng
 * và checkout cần cả hai: mở cho khách vãng lai, NHƯNG vẫn nhận ra người đã
 * đăng nhập để gắn `userId` cho giỏ và cho đơn hàng.
 *
 * Cách dùng: đặt `@Public()` ở controller để vô hiệu `JwtAuthGuard` toàn cục,
 * rồi thêm `@UseGuards(OptionalJwtAuthGuard)` để gán `request.user`. Guard khai
 * ở controller chạy sau guard toàn cục nên thứ tự này hoạt động.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        try {
            await super.canActivate(context);
        } catch {
            // `JwtStrategy.validate` gọi `verifyTokenVersion` và ném lỗi khi token
            // đã bị thu hồi — lỗi đó thoát ra ở đây chứ không qua `handleRequest`,
            // nên phải bắt tại chỗ này thay vì chỉ dựa vào `handleRequest`.
        }
        return true;
    }

    /** Bản gốc ném 401 khi không có user; ở đây thiếu user là hợp lệ. */
    handleRequest<TUser>(_err: unknown, user: TUser): TUser | undefined {
        return user || undefined;
    }
}
