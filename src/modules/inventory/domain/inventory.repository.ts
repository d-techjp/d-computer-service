import type { RepositoryPage } from '../../../common/interfaces/repository-page.interface';
import type { ProductVariant } from '../../products/entities/product-variant.entity';
import type { QueryInventoryStockDto } from '../dto/query-inventory-stock.dto';
import type { QueryInventoryTransactionDto } from '../dto/query-inventory-transaction.dto';
import type { InventoryTransaction } from '../entities/inventory-transaction.entity';
import type {
    InventoryReasonCode,
    InventoryReferenceType,
    InventoryTransactionType,
} from '../enums/inventory.enum';

/** Một dòng tồn kho theo variant — không phải entity, chỉ dùng cho danh sách. */
export interface VariantStockRow {
    variantId: string;
    sku: string;
    variantName: string;
    productId: string;
    productName: string;
    thumbnail: string | null;
    stock: number;
    lowStockThreshold: number;
    isLowStock: boolean;
    trackInventory: boolean;
    /** Tổng số lượng đã nhập (SUM quantity của các dòng `type = in`) từ trước tới nay. */
    totalReceived: number;
    /** Tổng số đã bán — tái dùng `ProductVariant.soldCount` có sẵn. */
    totalSold: number;
}

export interface RecordMovementInput {
    variantId: string;
    type: InventoryTransactionType;
    reasonCode: InventoryReasonCode;
    quantity: number;
    stockBefore: number;
    stockAfter: number;
    referenceType?: InventoryReferenceType | null;
    referenceId?: string | null;
    performedById?: string | null;
    note?: string | null;
}

/**
 * Nhập/xuất/điều chỉnh thủ công phải khoá variant (FOR UPDATE), trừ/cộng kho
 * rồi ghi sổ trong CÙNG một transaction — giống cơ chế `OrdersUnitOfWork` bên
 * module `orders`.
 */
export interface InventoryUnitOfWork {
    /** SELECT ... FOR UPDATE một variant; ném NotFoundException nếu không có. */
    lockVariant(variantId: string): Promise<ProductVariant>;

    saveVariant(variant: ProductVariant): Promise<ProductVariant>;

    recordMovement(data: RecordMovementInput): Promise<InventoryTransaction>;

    /** Tính lại min/max giá, tồn kho, đã bán của product chứa variant — tái dùng products. */
    refreshProductAggregates(productId: string): Promise<void>;
}

export abstract class InventoryRepository {
    abstract searchStock(
        criteria: QueryInventoryStockDto,
    ): Promise<RepositoryPage<VariantStockRow>>;

    abstract searchTransactions(
        criteria: QueryInventoryTransactionDto,
    ): Promise<RepositoryPage<InventoryTransaction>>;

    abstract runTransaction<T>(work: (uow: InventoryUnitOfWork) => Promise<T>): Promise<T>;

    /**
     * Ghi một dòng sổ KHÔNG kèm khoá/transaction — dùng cho nơi đã tự
     * trừ/cộng `ProductVariant.stock` từ trước (vd `ProductVariantsService.adjustStock`).
     */
    abstract recordStandalone(data: RecordMovementInput): Promise<InventoryTransaction>;
}
