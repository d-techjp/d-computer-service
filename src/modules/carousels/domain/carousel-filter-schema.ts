import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SortOrder } from '../../../common/dto/pagination-query.dto';
import { PRODUCT_SORTABLE_COLUMNS } from '../../products/domain/product-sortable-columns';
import { ProductType } from '../../products/entities/product.entity';
import type { CarouselFilters } from './carousel-filters';

export class FilterFieldOption {
    @ApiProperty() value: string;
    @ApiProperty() label: string;
}

/** Mô tả một ô lọc để admin UI dựng form động. */
export class FilterFieldSchema {
    @ApiProperty({ example: 'categoryId' }) key: keyof CarouselFilters;
    @ApiProperty({ enum: ['string', 'number', 'boolean', 'uuid', 'enum'] })
    type: 'string' | 'number' | 'boolean' | 'uuid' | 'enum';
    @ApiProperty({ example: 'Danh mục' }) label: string;
    @ApiPropertyOptional({ type: [FilterFieldOption] }) options?: FilterFieldOption[];
    @ApiPropertyOptional({
        enum: ['categories', 'brands'],
        description: 'Endpoint admin UI gọi để đổ dropdown cho các key dạng uuid',
    })
    source?: 'categories' | 'brands';
}

const SORT_BY_LABELS: Record<(typeof PRODUCT_SORTABLE_COLUMNS)[number], string> = {
    createdAt: 'Mới nhất',
    updatedAt: 'Vừa cập nhật',
    name: 'Tên',
    minPrice: 'Giá',
    totalStock: 'Tồn kho',
    soldCount: 'Bán chạy',
    viewCount: 'Xem nhiều',
};

/**
 * Nguồn dữ liệu cho `GET /admin/carousels/filter-schema`. Danh sách key ở đây phải
 * khớp `CarouselFiltersDto` — thêm ô lọc mới thì sửa cả hai chỗ, nếu không admin UI
 * sẽ không bao giờ dựng được ô đó dù BE đã nhận.
 */
export const CAROUSEL_FILTER_SCHEMA: readonly FilterFieldSchema[] = [
    { key: 'search', type: 'string', label: 'Từ khoá' },
    { key: 'categoryId', type: 'uuid', label: 'Danh mục', source: 'categories' },
    { key: 'includeSubCategories', type: 'boolean', label: 'Gồm danh mục con' },
    { key: 'brandId', type: 'uuid', label: 'Thương hiệu', source: 'brands' },
    {
        key: 'productType',
        type: 'enum',
        label: 'Loại sản phẩm',
        options: [
            { value: ProductType.STANDARD, label: 'Hàng hoá' },
            { value: ProductType.BUNDLE, label: 'Combo' },
            { value: ProductType.SERVICE, label: 'Dịch vụ' },
        ],
    },
    { key: 'minPrice', type: 'number', label: 'Giá từ' },
    { key: 'maxPrice', type: 'number', label: 'Giá đến' },
    { key: 'inStock', type: 'boolean', label: 'Chỉ hàng còn' },
    { key: 'isFeatured', type: 'boolean', label: 'Chỉ hàng nổi bật' },
    {
        key: 'sortBy',
        type: 'enum',
        label: 'Sắp xếp theo',
        options: PRODUCT_SORTABLE_COLUMNS.map((column) => ({
            value: column,
            label: SORT_BY_LABELS[column],
        })),
    },
    {
        key: 'sortOrder',
        type: 'enum',
        label: 'Chiều sắp xếp',
        options: [
            { value: SortOrder.ASC, label: 'Tăng dần' },
            { value: SortOrder.DESC, label: 'Giảm dần' },
        ],
    },
];
