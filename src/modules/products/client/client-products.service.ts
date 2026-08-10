import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import type { ProductDescriptionView } from '../application/products.service';
import { ProductsService } from '../application/products.service';
import { Product } from '../entities/product.entity';
import { VISIBLE_STATUSES } from './client-visibility';
import type { ClientQueryProductDto } from './dto/client-query-product.dto';

/** Lớp mỏng bọc `ProductsService` cho storefront: mọi truy vấn đều bị rào theo `VISIBLE_STATUSES`. */
@Injectable()
export class ClientProductsService {
    constructor(private readonly productsService: ProductsService) {}

    findAll(query: ClientQueryProductDto): Promise<PaginatedResult<Product>> {
        // ClientQueryProductDto là tập con của QueryProductDto (thiếu đúng `status`),
        // và rào trạng thái đi qua tham số riêng nên client không nới rộng được.
        return this.productsService.findAll(query, VISIBLE_STATUSES);
    }

    findOne(id: string): Promise<Product> {
        return this.productsService.findOne(id, VISIBLE_STATUSES);
    }

    findBySlug(slug: string): Promise<Product> {
        return this.productsService.findBySlug(slug, VISIBLE_STATUSES);
    }

    getDescription(id: string): Promise<ProductDescriptionView> {
        return this.productsService.getDescription(id, VISIBLE_STATUSES);
    }

    /** Xác nhận sản phẩm hiển thị được rồi mới cho đọc dữ liệu con (biến thể, option). */
    assertVisible(id: string): Promise<void> {
        return this.productsService.assertExists(id, VISIBLE_STATUSES);
    }
}
