import { Role } from './role.enum';

/**
 * Permission dạng `module.action`, gom theo module cho admin UI.
 * Phase hiện tại chưa tách chi tiết theo từng API — mỗi module dùng chung 1
 * permission `manage`/`view` cho mọi endpoint quản trị liên quan.
 */
export enum Permission {
    DASHBOARD_VIEW = 'dashboard.view',

    USER_CUSTOMER_MANAGE = 'user.customer.manage',
    USER_ADMINISTRATOR_MANAGE = 'user.admin.manage',
    USER_ROLE_MANAGE = 'user.role.manage',

    PRODUCT_MANAGE = 'product.manage',
    PRODUCT_CATEGORY_MANAGE = 'product.category.manage',
    PRODUCT_BRAND_MANAGE = 'product.brand.manage',

    ARTICLE_MANAGE = 'articles.manage',

    ORDERS_MANAGE = 'orders.manage',

    INVENTORY_MANAGE = 'inventory.manage',

    LOGS_VIEW = 'logs.view',
}

/**
 * Nguồn sự thật duy nhất cho mapping role -> permission, dùng bởi
 * `/auth/permissions` để client lưu vào storage và quyết định hiển thị UI.
 * Phase hiện tại chỉ phân theo module (chưa tách theo từng API) — sửa quyền
 * truy cập backend (`@Roles(...)` trên controller) thì cân nhắc sửa cả bảng
 * này cho khớp.
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
    [Role.ADMIN]: Object.values(Permission),
    [Role.STAFF]: [
        Permission.DASHBOARD_VIEW,
        Permission.USER_CUSTOMER_MANAGE,
        Permission.PRODUCT_MANAGE,
        Permission.PRODUCT_CATEGORY_MANAGE,
        Permission.PRODUCT_BRAND_MANAGE,
        Permission.ARTICLE_MANAGE,
    ],
    [Role.CUSTOMER]: [],
};
