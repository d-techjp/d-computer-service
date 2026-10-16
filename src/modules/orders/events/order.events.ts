import type { OrderStatus } from '../enums/order.enum';

/**
 * Sự kiện nghiệp vụ của đơn hàng, phát SAU khi transaction đã commit. Module
 * khác (email, sau này là thông báo/analytics) nghe ở đây thay vì để
 * `OrdersService` gọi thẳng — orders không cần biết ai đang quan tâm.
 *
 * Chỉ mang id: listener tự đọc lại đơn, luôn thấy bản đã commit.
 */
export const ORDER_EVENTS = {
    /** Đơn chính thức được nhận: COD vừa đặt, hoặc đơn online vừa thanh toán xong. */
    PLACED: 'order.placed',
    STATUS_CHANGED: 'order.status_changed',
} as const;

export class OrderPlacedEvent {
    constructor(readonly orderId: string) {}
}

export class OrderStatusChangedEvent {
    constructor(
        readonly orderId: string,
        readonly from: OrderStatus,
        readonly to: OrderStatus,
    ) {}
}
