import type { BundleItemInputDto } from '../dto/set-bundle-items.dto';
import type { ProductBundleItem } from '../entities/product-bundle-item.entity';

export abstract class ProductBundleItemsRepository {
    /** Kèm `componentVariant` — service cần stock của component để tính tồn kho combo. */
    abstract findByBundleVariantId(bundleVariantId: string): Promise<ProductBundleItem[]>;

    abstract findByBundleVariantIds(bundleVariantIds: string[]): Promise<ProductBundleItem[]>;

    /** Số combo đang dùng biến thể này làm thành phần — chặn xoá biến thể. */
    abstract countByComponentVariantId(componentVariantId: string): Promise<number>;

    /**
     * Id các variant combo (chỉ loại `derived_from_components`) đang chứa một
     * trong các component này — dùng để làm mới tồn kho combo sau khi kho
     * thành phần thay đổi.
     */
    abstract findDerivedBundleVariantIdsByComponentIds(
        componentVariantIds: string[],
    ): Promise<string[]>;

    abstract replaceAll(
        bundleVariantId: string,
        items: BundleItemInputDto[],
    ): Promise<ProductBundleItem[]>;
}
