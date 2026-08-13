import type { SortOrder } from '../../../common/dto/pagination-query.dto';
import type { ProductSortableColumn } from '../../products/domain/product-sortable-columns';
import type { ProductType } from '../../products/entities/product.entity';

/**
 * Bộ lọc sản phẩm đã lưu của một carousel. Tập key trùng `ClientQueryProductDto`,
 * TRỪ `page`/`limit` (chuyện phân trang, thuộc về lời gọi) và `status` (rào hiển
 * thị do server áp, admin không được phép chạm tới — thiếu key này là lý do
 * carousel không thể lôi hàng nháp ra storefront).
 */
export interface CarouselFilters {
    search?: string;
    categoryId?: string;
    includeSubCategories?: boolean;
    brandId?: string;
    productType?: ProductType;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    isFeatured?: boolean;
    sortBy?: ProductSortableColumn;
    sortOrder?: SortOrder;
}

/**
 * Thứ tự sinh `filterQuery`. Cố định và độc lập với thứ tự key client gửi lên:
 * hai carousel cùng bộ lọc luôn ra cùng một chuỗi, nhờ vậy so sánh/cache được.
 */
export const CAROUSEL_FILTER_KEYS = [
    'search',
    'categoryId',
    'includeSubCategories',
    'brandId',
    'productType',
    'minPrice',
    'maxPrice',
    'inStock',
    'isFeatured',
    'sortBy',
    'sortOrder',
] as const satisfies readonly (keyof CarouselFilters)[];

/** Giá trị coi như "không lọc" — bỏ khỏi query string thay vì sinh `key=`. */
const isBlank = (value: unknown): boolean => value === undefined || value === null || value === '';

/**
 * Dựng query string tương ứng với bộ lọc. Đây là cột `filter_query`: bản đọc được
 * của `filters`, dán thẳng sang `/products?...` là ra đúng tập sản phẩm đó.
 */
export const buildFilterQuery = (filters: CarouselFilters): string => {
    const params = new URLSearchParams();

    for (const key of CAROUSEL_FILTER_KEYS) {
        const value = filters[key];
        if (!isBlank(value)) params.append(key, String(value));
    }

    return params.toString();
};

/** Bỏ các key rỗng trước khi ghi xuống DB — `filters` và `filterQuery` luôn khớp nhau. */
export const normalizeFilters = (filters: CarouselFilters): CarouselFilters => {
    const result: Record<string, unknown> = {};

    for (const key of CAROUSEL_FILTER_KEYS) {
        const value = filters[key];
        if (!isBlank(value)) result[key] = value;
    }

    return result;
};
