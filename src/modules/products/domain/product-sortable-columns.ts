/**
 * Cột được phép sắp xếp khi tìm sản phẩm. Nằm ở tầng domain vì không chỉ repository
 * dùng: DTO của carousel validate `sortBy` lưu trong bộ lọc theo đúng danh sách này,
 * để bộ lọc lưu xuống DB không bao giờ chứa cột mà truy vấn sẽ âm thầm bỏ qua.
 */
export const PRODUCT_SORTABLE_COLUMNS = [
    'createdAt',
    'updatedAt',
    'name',
    'minPrice',
    'totalStock',
    'soldCount',
    'viewCount',
] as const;

export type ProductSortableColumn = (typeof PRODUCT_SORTABLE_COLUMNS)[number];
