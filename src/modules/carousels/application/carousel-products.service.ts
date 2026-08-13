import { Injectable } from '@nestjs/common';
import { SortOrder } from '../../../common/dto/pagination-query.dto';
import type { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import { ProductsService } from '../../products/application/products.service';
import { VISIBLE_STATUSES } from '../../products/client/client-visibility';
import { QueryProductDto } from '../../products/dto/query-product.dto';
import type { Product } from '../../products/entities/product.entity';
import type { CarouselFilters } from '../domain/carousel-filters';

export interface CarouselPage {
    page: number;
    limit: number;
}

/**
 * Dịch bộ lọc đã lưu của carousel thành truy vấn sản phẩm.
 *
 * Bộ lọc là toàn bộ những gì quyết định nội dung — phía gọi chỉ thêm phân trang.
 * Khách muốn lọc thêm thì FE ghép `filterQuery` với facet của khách rồi gọi
 * `GET /products`, nên ở đây không có chuyện hai bộ lọc phải hoà với nhau.
 *
 * Rào `VISIBLE_STATUSES` áp ở đây, không lấy từ bộ lọc: `CarouselFilters` không có
 * key `status` nên admin không thể lưu một carousel lôi hàng nháp ra storefront.
 */
@Injectable()
export class CarouselProductsService {
    constructor(private readonly productsService: ProductsService) {}

    listProducts(
        filters: CarouselFilters,
        { page, limit }: CarouselPage,
    ): Promise<PaginatedResult<Product>> {
        return this.productsService.findAll(this.toQuery(filters, page, limit), VISIBLE_STATUSES);
    }

    /** Số sản phẩm khớp bộ lọc — lấy `meta.total`, chỉ nạp 1 bản ghi cho nhẹ. */
    async countProducts(filters: CarouselFilters): Promise<number> {
        const result = await this.listProducts(filters, { page: 1, limit: 1 });
        return result.meta.total;
    }

    private toQuery(filters: CarouselFilters, page: number, limit: number): QueryProductDto {
        // Gán lên instance thật (không phải object literal) để giữ getter `skip` trên prototype
        return Object.assign(new QueryProductDto(), filters, {
            page,
            limit,
            sortBy: filters.sortBy ?? 'createdAt',
            sortOrder: filters.sortOrder ?? SortOrder.DESC,
        });
    }
}
