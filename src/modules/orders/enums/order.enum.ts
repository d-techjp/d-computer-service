export enum OrderStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    PROCESSING = 'processing',
    SHIPPING = 'shipping',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
    REFUNDED = 'refunded',
}

export enum PaymentStatus {
    UNPAID = 'unpaid',
    PAID = 'paid',
    REFUNDED = 'refunded',
    FAILED = 'failed',
}

export enum PaymentMethod {
    COD = 'cod',
    BANK_TRANSFER = 'bank_transfer',
    CREDIT_CARD = 'credit_card',
    E_WALLET = 'e_wallet',
}

/**
 * Máy trạng thái đơn hàng: từ trạng thái hiện tại chỉ được chuyển sang các trạng thái liệt kê.
 * COMPLETED / REFUNDED là trạng thái kết thúc.
 */
export const ORDER_STATUS_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
    [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
    [OrderStatus.PROCESSING]: [OrderStatus.SHIPPING, OrderStatus.CANCELLED],
    [OrderStatus.SHIPPING]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
    [OrderStatus.COMPLETED]: [OrderStatus.REFUNDED],
    [OrderStatus.CANCELLED]: [],
    [OrderStatus.REFUNDED]: [],
};

/** Các trạng thái mà hàng đã được trừ khỏi kho và cần hoàn lại khi huỷ. */
export const STOCK_RESERVED_STATUSES: readonly OrderStatus[] = [
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.PROCESSING,
    OrderStatus.SHIPPING,
    OrderStatus.COMPLETED,
];
