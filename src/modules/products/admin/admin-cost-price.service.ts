import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import { ProductVariantsRepository } from '../domain/product-variants.repository';
import { ProductVariant } from '../entities/product-variant.entity';
import { Product } from '../entities/product.entity';

/**
 * Gắn `costPrice` vào biến thể trước khi trả về cho trang quản trị.
 *
 * Giá vốn không đi kèm truy vấn thường vì cột khai `select: false` — đó là lý do
 * storefront không đời nào lộ nó, kể cả khi ai đó lỡ thêm một endpoint public mới.
 * Đổi lại, phía quản trị phải chủ động gắn vào, và đó là việc của service này.
 *
 * Chi phí: đúng MỘT truy vấn phụ cho cả lô biến thể, bất kể lồng sâu bao nhiêu.
 */
@Injectable()
export class AdminCostPriceService {
    constructor(private readonly variantsRepository: ProductVariantsRepository) {}

    /** Gắn giá vốn tại chỗ vào một lô biến thể rồi trả lại chính lô đó. */
    async attach<T extends ProductVariant>(variants: T[]): Promise<T[]> {
        if (variants.length === 0) return variants;

        const costPrices = await this.variantsRepository.findCostPrices(
            variants.map((variant) => variant.id),
        );
        for (const variant of variants) {
            variant.costPrice = costPrices.get(variant.id) ?? null;
        }
        return variants;
    }

    async attachToVariant(variant: ProductVariant): Promise<ProductVariant> {
        const [decorated] = await this.attach([variant]);
        return decorated ?? variant;
    }

    async attachToProduct(product: Product): Promise<Product> {
        await this.attach(product.variants ?? []);
        return product;
    }

    /** Gom biến thể của mọi sản phẩm trong trang thành một lô — vẫn chỉ một truy vấn. */
    async attachToPage(page: PaginatedResult<Product>): Promise<PaginatedResult<Product>> {
        await this.attach(page.items.flatMap((product) => product.variants ?? []));
        return page;
    }
}
