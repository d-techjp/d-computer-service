export enum OrderStatus {
    /**
     * Đơn thanh toán online (Stripe) đã tạo nhưng khách chưa trả tiền. CHƯA trừ
     * kho — kho chỉ bị trừ khi Stripe báo thanh toán thành công, lúc đó đơn mới
     * sang `pending` như đơn COD. Không có trong `STOCK_RESERVED_STATUSES`.
     */
    AWAITING_PAYMENT = 'awaiting_payment',
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
    /** Stripe Checkout — khách chọn thẻ hoặc PayPay ngay trên trang của Stripe. */
    STRIPE = 'stripe',
}

/** Ngôn ngữ storefront — quyết định ngôn ngữ email gửi khách và trang Stripe. */
export const ORDER_LOCALES = ['ja', 'vi'] as const;
export type OrderLocale = (typeof ORDER_LOCALES)[number];
export const DEFAULT_ORDER_LOCALE: OrderLocale = 'ja';

/**
 * Máy trạng thái đơn hàng: từ trạng thái hiện tại chỉ được chuyển sang các trạng thái liệt kê.
 * COMPLETED / REFUNDED là trạng thái kết thúc.
 *
 * AWAITING_PAYMENT -> PENDING cố ý KHÔNG nằm ở đây: bước đó chỉ webhook Stripe
 * được làm (`OrdersService.confirmOnlinePayment`, kèm trừ kho). Để trong bảng thì
 * admin bấm tay được, đơn chưa trả tiền sẽ đi tiếp mà kho không hề bị trừ.
 */
export const ORDER_STATUS_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
    [OrderStatus.AWAITING_PAYMENT]: [OrderStatus.CANCELLED],
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
