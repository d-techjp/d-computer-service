/**
 * Code của các role hệ thống — được seed vào bảng `roles` và dùng trong
 * `@Roles(...)`. Role do admin tự tạo không có mặt ở đây, phân quyền cho
 * chúng bằng `@RequirePermissions(...)`.
 */
export enum RoleCode {
    ADMIN = 'admin',
    STAFF = 'staff',
    CUSTOMER = 'customer',
}
