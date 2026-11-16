/**
 * Slug không được dùng cho trang tĩnh, vì trang tĩnh nằm ngay dưới gốc storefront
 * (`/{slug}`): trùng tên với route có sẵn thì route có sẵn thắng và trang tĩnh
 * không bao giờ hiện ra — admin sẽ tưởng đã xuất bản mà khách không thấy.
 *
 * Phải khớp với các thư mục route trong `d-computer-client/src/app/`. Có thêm vài
 * tên dành sẵn (`account`, `orders`, `search`, `sitemap`…) cho trang sắp làm, và
 * `ja`/`vi` vì storefront redirect 301 hai tiền tố ngôn ngữ cũ này.
 */
export const RESERVED_PAGE_SLUGS: ReadonlySet<string> = new Set([
    'api',
    'articles',
    'cart',
    'checkout',
    'login',
    'register',
    'products',
    'tokushoho',
    'tiktok',
    'account',
    'orders',
    'search',
    'sitemap',
    'robots',
    'admin',
    'images',
    'ja',
    'vi',
]);
