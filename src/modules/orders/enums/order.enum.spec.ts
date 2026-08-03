import { ORDER_STATUS_TRANSITIONS, OrderStatus } from './order.enum';

describe('ORDER_STATUS_TRANSITIONS', () => {
    it('khai báo đủ mọi trạng thái', () => {
        for (const status of Object.values(OrderStatus)) {
            expect(ORDER_STATUS_TRANSITIONS[status]).toBeDefined();
        }
    });

    it('cancelled và refunded là trạng thái kết thúc', () => {
        expect(ORDER_STATUS_TRANSITIONS[OrderStatus.CANCELLED]).toHaveLength(0);
        expect(ORDER_STATUS_TRANSITIONS[OrderStatus.REFUNDED]).toHaveLength(0);
    });

    it('không cho quay ngược từ completed về shipping', () => {
        expect(ORDER_STATUS_TRANSITIONS[OrderStatus.COMPLETED]).not.toContain(OrderStatus.SHIPPING);
    });

    it('mọi trạng thái đang xử lý đều huỷ được', () => {
        const cancellable = [
            OrderStatus.PENDING,
            OrderStatus.CONFIRMED,
            OrderStatus.PROCESSING,
            OrderStatus.SHIPPING,
        ];
        for (const status of cancellable) {
            expect(ORDER_STATUS_TRANSITIONS[status]).toContain(OrderStatus.CANCELLED);
        }
    });
});
