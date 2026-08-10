import { Injectable, NotFoundException } from '@nestjs/common';
import type { BundleAvailability } from '../application/product-bundles.service';
import { ProductBundlesService } from '../application/product-bundles.service';
import { ProductVariantsService } from '../application/product-variants.service';
import { ProductBundleItem } from '../entities/product-bundle-item.entity';
import { ProductVariant } from '../entities/product-variant.entity';
import { VISIBLE_STATUSES } from './client-visibility';

/**
 * Lớp mỏng bọc `ProductVariantsService` cho storefront: chặn đọc biến thể của
 * sản phẩm chưa phát hành.
 *
 * CHỦ Ý không lọc theo `variant.isActive`: biến thể tắt không phải dữ liệu mật
 * (client vẫn nhận `isActive: false` và tự ẩn), và `GET /products/:id` xưa nay
 * đã trả về chúng — lọc ở đây sẽ khiến hai endpoint lệch nhau.
 */
@Injectable()
export class ClientVariantsService {
    constructor(
        private readonly variantsService: ProductVariantsService,
        private readonly bundlesService: ProductBundlesService,
    ) {}

    async findOne(id: string): Promise<ProductVariant> {
        const variant = await this.variantsService.findOne(id);

        // `findById` đã nạp kèm `product`, nên kiểm tra trạng thái không tốn thêm truy vấn
        if (!VISIBLE_STATUSES.includes(variant.product.status)) {
            throw new NotFoundException(`Không tìm thấy biến thể với id ${id}`);
        }
        return variant;
    }

    async findBundleItems(id: string): Promise<ProductBundleItem[]> {
        await this.findOne(id);
        return this.bundlesService.findItems(id);
    }

    async resolveAvailability(id: string): Promise<BundleAvailability> {
        await this.findOne(id);
        return this.bundlesService.resolveAvailability(id);
    }
}
