import { SortOrder } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import type { ProductsService } from '../../products/application/products.service';
import { VISIBLE_STATUSES } from '../../products/client/client-visibility';
import type { QueryProductDto } from '../../products/dto/query-product.dto';
import { ProductType, type Product } from '../../products/entities/product.entity';
import { CarouselProductsService } from './carousel-products.service';

describe('CarouselProductsService', () => {
    let findAll: jest.MockedFunction<ProductsService['findAll']>;
    let service: CarouselProductsService;

    beforeEach(() => {
        findAll = jest.fn<
            ReturnType<ProductsService['findAll']>,
            Parameters<ProductsService['findAll']>
        >();
        findAll.mockResolvedValue(new PaginatedResult<Product>([], 0, 1, 20));

        service = new CarouselProductsService({ findAll } as unknown as ProductsService);
    });

    const criteria = (): QueryProductDto => findAll.mock.calls[0][0];

    it('luôn rào theo trạng thái công khai, không lấy từ bộ lọc đã lưu', async () => {
        await service.listProducts({}, { page: 1, limit: 20 });

        expect(findAll).toHaveBeenCalledWith(expect.anything(), VISIBLE_STATUSES);
    });

    it('giữ getter `skip` — criteria phải là instance thật, không phải object literal', async () => {
        await service.listProducts({}, { page: 3, limit: 10 });

        expect(criteria().skip).toBe(20);
    });

    it('chuyển nguyên bộ lọc đã lưu thành điều kiện truy vấn', async () => {
        await service.listProducts(
            {
                categoryId: 'c1',
                includeSubCategories: true,
                brandId: 'b1',
                productType: ProductType.STANDARD,
                minPrice: 15_000_000,
                maxPrice: 30_000_000,
                inStock: true,
                isFeatured: true,
                search: 'gaming',
            },
            { page: 1, limit: 12 },
        );

        expect(criteria()).toMatchObject({
            categoryId: 'c1',
            includeSubCategories: true,
            brandId: 'b1',
            productType: ProductType.STANDARD,
            minPrice: 15_000_000,
            maxPrice: 30_000_000,
            inStock: true,
            isFeatured: true,
            search: 'gaming',
            page: 1,
            limit: 12,
        });
    });

    it('phân trang của phía gọi luôn thắng, bộ lọc không mang theo page/limit', async () => {
        await service.listProducts({ sortBy: 'soldCount' }, { page: 2, limit: 6 });

        expect(criteria().page).toBe(2);
        expect(criteria().limit).toBe(6);
    });

    it('lấy thứ tự sắp xếp trong bộ lọc', async () => {
        await service.listProducts(
            { sortBy: 'soldCount', sortOrder: SortOrder.ASC },
            { page: 1, limit: 20 },
        );

        expect(criteria().sortBy).toBe('soldCount');
        expect(criteria().sortOrder).toBe(SortOrder.ASC);
    });

    it('bộ lọc không đặt thứ tự -> mặc định createdAt DESC', async () => {
        await service.listProducts({}, { page: 1, limit: 20 });

        expect(criteria().sortBy).toBe('createdAt');
        expect(criteria().sortOrder).toBe(SortOrder.DESC);
    });

    it('countProducts lấy meta.total và chỉ nạp 1 bản ghi', async () => {
        findAll.mockResolvedValueOnce(new PaginatedResult<Product>([], 137, 1, 1));

        await expect(service.countProducts({ brandId: 'dell' })).resolves.toBe(137);
        expect(criteria().limit).toBe(1);
    });
});
