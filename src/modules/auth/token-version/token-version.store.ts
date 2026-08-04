/**
 * Kho lưu "token version" của từng user.
 *
 * Quy ước: JWT mang claim `ver`. Token chỉ hợp lệ khi `ver` khớp version đang lưu.
 * - login  -> tăng version (token cũ lập tức mất hiệu lực => mỗi user 1 phiên)
 * - logout -> tăng version (token đang cầm mất hiệu lực)
 *
 * Đây là abstract class (không phải interface) để dùng luôn làm DI token trong Nest.
 * Bản đang dùng: RedisTokenVersionStore (đổi provider trong AuthModule nếu cần bản khác).
 */
export abstract class TokenVersionStore {
    /** Version hiện tại, hoặc null nếu không còn bản ghi (hết TTL). */
    abstract get(userId: string): Promise<number | null>;

    /** Tăng version lên 1 và trả về giá trị mới. */
    abstract increment(userId: string): Promise<number>;

    /** Xoá bản ghi — mọi token của user trở thành không hợp lệ. */
    abstract revoke(userId: string): Promise<void>;

    /** Số user đang có phiên được theo dõi (phục vụ health/observability). */
    abstract size(): Promise<number>;
}
