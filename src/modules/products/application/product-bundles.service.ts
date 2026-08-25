import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductBundleItemsRepository } from '../domain/product-bundle-items.repository';
import { ProductVariantsRepository } from '../domain/product-variants.repository';
import { ProductsRepository } from '../domain/products.repository';
import type { SetBundleItemsDto } from '../dto/set-bundle-items.dto';
import type { ProductBundleItem } from '../entities/product-bundle-item.entity';
import { BundleInventoryPolicy, ProductVariant } from '../entities/product-variant.entity';
import { Product, ProductStatus, ProductType } from '../entities/product.entity';

const UNLIMITED_BUNDLE_STOCK = 999_999;

export interface BundleAvailability {
    variantId: string;
    /** Số combo còn bán được. `null` = không giới hạn (mọi thành phần đều không quản kho). */
    available: number | null;
    /** Thành phần đang chặn tồn kho — hữu ích cho màn hình quản trị kho. */
    limitedBy: { variantId: string; sku: string; stock: number; quantity: number }[];
}

@Injectable()
export class ProductBundlesService {
    constructor(
        private readonly bundleItemsRepository: ProductBundleItemsRepository,
        private readonly variantsRepository: ProductVariantsRepository,
        private readonly productsRepository: ProductsRepository,
    ) {}

    async findItems(bundleVariantId: string): Promise<ProductBundleItem[]> {
        await this.findBundleVariantOrFail(bundleVariantId);
        return this.bundleItemsRepository.findByBundleVariantId(bundleVariantId);
    }

    /** Thay thế toàn bộ danh sách thành phần, rồi tính lại tồn kho cache của combo. */
    async setItems(bundleVariantId: string, dto: SetBundleItemsDto): Promise<ProductBundleItem[]> {
        const bundleVariant = await this.findBundleVariantOrFail(bundleVariantId);
        await this.assertComponentsValid(bundleVariantId, dto);

        const items = await this.bundleItemsRepository.replaceAll(bundleVariantId, dto.items);
        await this.refreshBundleStock(bundleVariant);
        return items;
    }

    /**
     * available = MIN( floor(stock thành phần / số lượng cần) ) trên các thành
     * phần BẮT BUỘC. Thành phần không theo dõi kho không giới hạn combo.
     * Đây là nguồn sự thật; cột `stock` của variant combo chỉ là bản cache.
     */
    async resolveAvailability(bundleVariantId: string): Promise<BundleAvailability> {
        const items = await this.bundleItemsRepository.findByBundleVariantId(bundleVariantId);
        return this.computeAvailability(bundleVariantId, items);
    }

    computeAvailability(bundleVariantId: string, items: ProductBundleItem[]): BundleAvailability {
        const required = items.filter((item) => !item.isOptional);

        if (required.length === 0) {
            return { variantId: bundleVariantId, available: 0, limitedBy: [] };
        }

        let available: number | null = null;
        for (const item of required) {
            if (!item.componentVariant.trackInventory) continue;

            const possible = Math.floor(item.componentVariant.stock / item.quantity);
            available = available === null ? possible : Math.min(available, possible);
        }

        const limitedBy =
            available === null
                ? []
                : required
                      .filter(
                          (item) =>
                              item.componentVariant.trackInventory &&
                              Math.floor(item.componentVariant.stock / item.quantity) === available,
                      )
                      .map((item) => ({
                          variantId: item.componentVariantId,
                          sku: item.componentVariant.sku,
                          stock: item.componentVariant.stock,
                          quantity: item.quantity,
                      }));

        return { variantId: bundleVariantId, available, limitedBy };
    }

    /**
     * Ghi tồn kho suy ra vào cột `stock` của variant combo. Nhờ bản cache này,
     * mọi thứ ở tầng đọc (danh sách, filter còn hàng, tổng tồn kho của product)
     * chạy như với hàng thường mà không cần biết combo là gì.
     */
    async refreshBundleStock(bundleVariant: ProductVariant): Promise<void> {
        if (bundleVariant.bundleInventoryPolicy !== BundleInventoryPolicy.DERIVED_FROM_COMPONENTS) {
            return;
        }

        const { available } = await this.resolveAvailability(bundleVariant.id);
        // `available = null` (mọi thành phần đều không quản kho) -> một con số lớn
        // nhưng vẫn an toàn với int4 của Postgres, để combo không bị coi là hết hàng.
        bundleVariant.stock = available ?? UNLIMITED_BUNDLE_STOCK;

        await this.variantsRepository.save(bundleVariant);
        await this.productsRepository.refreshAggregates(bundleVariant.productId);
    }

    /** Combo (bundle, chưa xoá) đang dùng sản phẩm này làm thành phần — cảnh báo trước khi xoá sản phẩm. */
    findBundlesUsingComponent(componentProductId: string): Promise<Product[]> {
        return this.bundleItemsRepository.findBundleProductsByComponentProductId(
            componentProductId,
        );
    }

    /**
     * Gọi sau khi xoá (mềm) một sản phẩm — mọi combo đang dùng nó làm thành phần
     * không còn đủ hàng để bán, tự chuyển về `draft` ("chưa bán") để admin biết
     * mà xử lý. `product_bundle_items` không tự dọn: component đã xoá vẫn còn
     * trong danh sách thành phần của combo cho tới khi admin tự gỡ ở tab
     * "Thành phần combo" (FE đánh dấu bằng `deletedAt` của `componentVariant.product`).
     */
    async deactivateBundlesUsingComponent(componentProductId: string): Promise<void> {
        const bundles = await this.findBundlesUsingComponent(componentProductId);
        const idsToDeactivate = bundles
            .filter((bundle) => bundle.status !== ProductStatus.DRAFT)
            .map((bundle) => bundle.id);
        if (idsToDeactivate.length > 0) {
            await this.productsRepository.bulkUpdateStatus(idsToDeactivate, ProductStatus.DRAFT);
        }
    }

    /** Gọi sau mỗi lần kho thành phần đổi (điều chỉnh kho, đặt đơn, huỷ đơn). */
    async refreshBundlesContaining(componentVariantIds: string[]): Promise<void> {
        const bundleIds =
            await this.bundleItemsRepository.findDerivedBundleVariantIdsByComponentIds(
                componentVariantIds,
            );
        if (bundleIds.length === 0) return;

        for (const variant of await this.variantsRepository.findByIds(bundleIds)) {
            await this.refreshBundleStock(variant);
        }
    }

    private async findBundleVariantOrFail(variantId: string): Promise<ProductVariant> {
        const variant = await this.variantsRepository.findById(variantId);
        if (!variant) throw new NotFoundException(`Không tìm thấy biến thể với id ${variantId}`);
        if (variant.product.productType !== ProductType.BUNDLE) {
            throw new BadRequestException(
                'Chỉ biến thể của sản phẩm có productType = bundle mới khai được thành phần',
            );
        }
        return variant;
    }

    /**
     * Ba ràng buộc mà Postgres không diễn đạt được bằng FK/CHECK:
     * combo không tự chứa chính nó, không lồng combo (tránh đệ quy khi tính
     * tồn kho), và không lặp cùng một thành phần hai dòng.
     */
    private async assertComponentsValid(
        bundleVariantId: string,
        dto: SetBundleItemsDto,
    ): Promise<void> {
        const componentIds = dto.items.map((item) => item.componentVariantId);

        if (componentIds.includes(bundleVariantId)) {
            throw new BadRequestException('Combo không thể chứa chính nó');
        }
        if (new Set(componentIds).size !== componentIds.length) {
            throw new BadRequestException(
                'Một thành phần chỉ được khai một dòng — dùng `quantity` để tăng số lượng',
            );
        }

        const components = await this.variantsRepository.findByIds(componentIds);
        const byId = new Map(components.map((component) => [component.id, component]));

        for (const id of componentIds) {
            const component = byId.get(id);
            if (!component) {
                throw new BadRequestException(`Không tìm thấy biến thể thành phần ${id}`);
            }
            if (component.product.productType === ProductType.BUNDLE) {
                throw new BadRequestException(
                    `"${component.sku}" là một combo — không cho phép combo lồng combo`,
                );
            }
        }
    }
}
