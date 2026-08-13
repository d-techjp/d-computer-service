import { SortOrder } from '../../../common/dto/pagination-query.dto';
import { ProductType } from '../../products/entities/product.entity';
import { buildFilterQuery, normalizeFilters, type CarouselFilters } from './carousel-filters';

describe('buildFilterQuery', () => {
    it('sinh chuỗi theo thứ tự key cố định, không theo thứ tự client gửi lên', () => {
        const scrambled: CarouselFilters = {
            sortOrder: SortOrder.DESC,
            inStock: true,
            categoryId: 'c1',
            sortBy: 'soldCount',
            minPrice: 15000000,
        };

        expect(buildFilterQuery(scrambled)).toBe(
            'categoryId=c1&minPrice=15000000&inStock=true&sortBy=soldCount&sortOrder=DESC',
        );
    });

    it('hai bộ lọc giống nhau nhưng khác thứ tự key ra cùng một chuỗi', () => {
        const a: CarouselFilters = { brandId: 'b1', isFeatured: true };
        const b: CarouselFilters = { isFeatured: true, brandId: 'b1' };

        expect(buildFilterQuery(a)).toBe(buildFilterQuery(b));
    });

    it('bỏ qua giá trị rỗng thay vì sinh key trống', () => {
        const filters = { search: '', categoryId: undefined, brandId: 'b1' } as CarouselFilters;

        expect(buildFilterQuery(filters)).toBe('brandId=b1');
    });

    it('bộ lọc rỗng ra chuỗi rỗng', () => {
        expect(buildFilterQuery({})).toBe('');
    });

    it('giữ được giá trị false — false là điều kiện thật, không phải "không lọc"', () => {
        expect(buildFilterQuery({ inStock: false })).toBe('inStock=false');
    });

    it('mã hoá giá trị có ký tự đặc biệt', () => {
        expect(buildFilterQuery({ search: 'laptop gaming & chuột' })).toBe(
            'search=laptop+gaming+%26+chu%E1%BB%99t',
        );
    });
});

describe('normalizeFilters', () => {
    it('loại key rỗng để `filters` và `filterQuery` luôn khớp nhau', () => {
        const filters = {
            search: '',
            categoryId: 'c1',
            brandId: undefined,
            productType: ProductType.STANDARD,
        } as CarouselFilters;

        expect(normalizeFilters(filters)).toEqual({
            categoryId: 'c1',
            productType: ProductType.STANDARD,
        });
    });

    it('bỏ key lạ lọt vào từ dữ liệu cũ', () => {
        const legacy = { categoryId: 'c1', status: 'draft' } as unknown as CarouselFilters;

        expect(normalizeFilters(legacy)).toEqual({ categoryId: 'c1' });
    });
});
