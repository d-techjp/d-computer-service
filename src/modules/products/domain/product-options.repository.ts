import type { ProductOptionInputDto } from '../dto/set-product-options.dto';
import type { ProductOptionValue } from '../entities/product-option-value.entity';
import type { ProductOption } from '../entities/product-option.entity';

export abstract class ProductOptionsRepository {
    /** Kèm `values`, sắp xếp theo `position` — thứ tự hiển thị của FE. */
    abstract findByProductId(productId: string): Promise<ProductOption[]>;

    abstract findValuesByIds(ids: string[]): Promise<ProductOptionValue[]>;

    /** Id các option value đang được ít nhất một biến thể sử dụng. */
    abstract findValueIdsInUse(productId: string): Promise<string[]>;

    /** Xoá sạch option cũ rồi ghi bộ mới trong một transaction (PUT semantics). */
    abstract replaceAll(
        productId: string,
        options: ProductOptionInputDto[],
    ): Promise<ProductOption[]>;
}
