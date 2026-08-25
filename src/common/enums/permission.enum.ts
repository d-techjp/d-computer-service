import { RoleCode } from './role.enum';

/**
 * Permission dạng `module.action`, gom theo module cho admin UI.
 * Phase hiện tại chưa tách chi tiết theo từng API — mỗi module dùng chung 1
 * permission `manage`/`view` cho mọi endpoint quản trị liên quan.
 *
 * Enum này là danh sách code dùng được trong `@RequirePermissions(...)` (an toàn
 * kiểu lúc compile) và là dữ liệu seed cho bảng `permissions`. Admin vẫn tạo thêm
 * permission qua API được — chỉ là chưa có route nào tham chiếu tới chúng.
 */
export enum PermissionCode {
    DASHBOARD_VIEW = 'dashboard.view',

    USER_CUSTOMER_MANAGE = 'user.customer.manage',
    USER_ADMINISTRATOR_MANAGE = 'user.admin.manage',
    USER_ROLE_MANAGE = 'user.role.manage',

    PRODUCT_MANAGE = 'product.manage',
    PRODUCT_CATEGORY_MANAGE = 'product.category.manage',
    PRODUCT_BRAND_MANAGE = 'product.brand.manage',
    PRODUCT_CAROUSEL_MANAGE = 'product.carousel.manage',

    CAMPAIGN_TIKTOK_MANAGE = 'campaign.tiktok.manage',

    SITE_SETTINGS_MANAGE = 'site.settings.manage',

    ARTICLE_MANAGE = 'articles.manage',

    ORDERS_MANAGE = 'orders.manage',

    INVENTORY_MANAGE = 'inventory.manage',

    LOGS_VIEW = 'logs.view',
}

export interface PermissionDefinition {
    code: PermissionCode;
    name: string;
    module: string;
    description: string;
}

/** Metadata để seed bảng `permissions` — `module` dùng gom nhóm trên admin UI. */
export const PERMISSION_CATALOG: readonly PermissionDefinition[] = [
    {
        code: PermissionCode.DASHBOARD_VIEW,
        name: 'Xem dashboard',
        module: 'dashboard',
        description: 'Xem số liệu tổng quan trên trang quản trị',
    },
    {
        code: PermissionCode.USER_CUSTOMER_MANAGE,
        name: 'Quản lý khách hàng',
        module: 'user',
        description: 'Xem và cập nhật tài khoản khách hàng',
    },
    {
        code: PermissionCode.USER_ADMINISTRATOR_MANAGE,
        name: 'Quản lý tài khoản quản trị',
        module: 'user',
        description: 'Tạo, sửa, xoá tài khoản admin/staff',
    },
    {
        code: PermissionCode.USER_ROLE_MANAGE,
        name: 'Quản lý vai trò & phân quyền',
        module: 'user',
        description: 'Tạo vai trò, gán permission cho vai trò, gán vai trò cho user',
    },
    {
        code: PermissionCode.PRODUCT_MANAGE,
        name: 'Quản lý sản phẩm',
        module: 'product',
        description: 'Tạo, sửa, xoá sản phẩm',
    },
    {
        code: PermissionCode.PRODUCT_CATEGORY_MANAGE,
        name: 'Quản lý danh mục',
        module: 'product',
        description: 'Tạo, sửa, xoá danh mục sản phẩm',
    },
    {
        code: PermissionCode.PRODUCT_BRAND_MANAGE,
        name: 'Quản lý thương hiệu',
        module: 'product',
        description: 'Tạo, sửa, xoá thương hiệu',
    },
    {
        code: PermissionCode.PRODUCT_CAROUSEL_MANAGE,
        name: 'Quản lý carousel',
        module: 'product',
        description: 'Tạo, sửa, xoá carousel và bộ lọc sản phẩm gắn kèm',
    },
    {
        code: PermissionCode.CAMPAIGN_TIKTOK_MANAGE,
        name: 'Quản lý video TikTok',
        module: 'campaign',
        description: 'Thêm, sửa, sắp xếp, xoá video TikTok hiển thị trên storefront',
    },
    {
        code: PermissionCode.SITE_SETTINGS_MANAGE,
        name: 'Quản lý thông tin cửa hàng',
        module: 'campaign',
        description: 'Sửa tên công ty, hotline, địa chỉ, link mạng xã hội hiển thị ở footer',
    },
    {
        code: PermissionCode.ARTICLE_MANAGE,
        name: 'Quản lý bài viết',
        module: 'article',
        description: 'Tạo, sửa, xuất bản, xoá bài viết',
    },
    {
        code: PermissionCode.ORDERS_MANAGE,
        name: 'Quản lý đơn hàng',
        module: 'order',
        description: 'Xem toàn bộ đơn, đổi trạng thái đơn và trạng thái thanh toán',
    },
    {
        code: PermissionCode.INVENTORY_MANAGE,
        name: 'Quản lý kho',
        module: 'inventory',
        description: 'Điều chỉnh tồn kho, xem cảnh báo sắp hết hàng',
    },
    {
        code: PermissionCode.LOGS_VIEW,
        name: 'Xem nhật ký hoạt động',
        module: 'system',
        description: 'Tra cứu activity log toàn hệ thống',
    },
];

export interface RoleDefinition {
    code: RoleCode;
    name: string;
    description: string;
    permissions: PermissionCode[];
}

/**
 * Dữ liệu seed cho 3 role hệ thống. Sau khi seed, nguồn sự thật là bảng
 * `roles`/`role_permissions` — admin đổi quyền qua API, không sửa file này.
 */
export const SYSTEM_ROLES: readonly RoleDefinition[] = [
    {
        code: RoleCode.ADMIN,
        name: 'Quản trị viên',
        description: 'Toàn quyền trên hệ thống',
        permissions: Object.values(PermissionCode),
    },
    {
        code: RoleCode.STAFF,
        name: 'Nhân viên',
        description: 'Vận hành sản phẩm, bài viết, đơn hàng',
        permissions: [
            PermissionCode.DASHBOARD_VIEW,
            PermissionCode.USER_CUSTOMER_MANAGE,
            PermissionCode.PRODUCT_MANAGE,
            PermissionCode.PRODUCT_CATEGORY_MANAGE,
            PermissionCode.PRODUCT_BRAND_MANAGE,
            PermissionCode.PRODUCT_CAROUSEL_MANAGE,
            PermissionCode.CAMPAIGN_TIKTOK_MANAGE,
            PermissionCode.SITE_SETTINGS_MANAGE,
            PermissionCode.ARTICLE_MANAGE,
        ],
    },
    {
        code: RoleCode.CUSTOMER,
        name: 'Khách hàng',
        description: 'Người dùng cuối — chỉ thao tác trên dữ liệu của chính mình',
        permissions: [],
    },
];
