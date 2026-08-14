export enum InventoryTransactionType {
    IN = 'in',
    OUT = 'out',
}

export enum InventoryReasonCode {
    /** Nhập hàng mới. */
    PURCHASE = 'purchase',
    /** Khách trả hàng, nhập lại kho. */
    RETURN_FROM_CUSTOMER = 'return_from_customer',
    /** Xuất do bán hàng — chỉ `orders` được ghi, không cho chọn thủ công. */
    ORDER_SALE = 'order_sale',
    /** Hoàn kho do huỷ đơn — chỉ `orders` được ghi, không cho chọn thủ công. */
    ORDER_CANCELLED = 'order_cancelled',
    /** Hàng lỗi/hư hỏng, loại khỏi kho. */
    DAMAGED = 'damaged',
    /** Thất thoát. */
    LOST = 'lost',
    /** Điều chỉnh sau kiểm kê. */
    STOCKTAKE_ADJUSTMENT = 'stocktake_adjustment',
    OTHER = 'other',
}

export enum InventoryReferenceType {
    ORDER = 'order',
    MANUAL = 'manual',
}

/** `reasonCode` được phép chọn khi nhập kho thủ công qua API. */
export const MANUAL_IMPORT_REASONS: readonly InventoryReasonCode[] = [
    InventoryReasonCode.PURCHASE,
    InventoryReasonCode.RETURN_FROM_CUSTOMER,
    InventoryReasonCode.STOCKTAKE_ADJUSTMENT,
    InventoryReasonCode.OTHER,
];

/** `reasonCode` được phép chọn khi xuất kho thủ công qua API. */
export const MANUAL_EXPORT_REASONS: readonly InventoryReasonCode[] = [
    InventoryReasonCode.DAMAGED,
    InventoryReasonCode.LOST,
    InventoryReasonCode.STOCKTAKE_ADJUSTMENT,
    InventoryReasonCode.OTHER,
];
