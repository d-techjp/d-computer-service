import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import { ProductVariantsRepository } from '../domain/product-variants.repository';
import { Product } from '../entities/product.entity';

/**
 * Gắn `variantCount` vào từng sản phẩm trước khi trả về cho danh sách quản trị.
 *
 * Response danh sách (`product.variants`) chỉ chứa đúng 1 biến thể mặc định —
 * `product.variants.length` không dùng được để suy ra tổng số biến thể, nên
 * phải hỏi riêng. Chi phí: đúng MỘT truy vấn GROUP BY cho cả trang.
 */
@Injectable()
export class AdminVariantCountService {
    constructor(private readonly variantsRepository: ProductVariantsRepository) {}

    async attachToPage(page: PaginatedResult<Product>): Promise<PaginatedResult<Product>> {
        if (page.items.length === 0) return page;

        const counts = await this.variantsRepository.countByProductIds(
            page.items.map((product) => product.id),
        );
        for (const product of page.items) {
            product.variantCount = counts.get(product.id) ?? 0;
        }
        return page;
    }
}
