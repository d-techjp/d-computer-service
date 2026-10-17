import type { Order } from '../../orders/entities/order.entity';
import { OrderStatus, PaymentMethod, PaymentStatus } from '../../orders/enums/order.enum';
import {
    buildOrderPlacedMail,
    buildOrderStatusMail,
    buildShopNewOrderMail,
    type ShopInfo,
} from './order-mail.templates';

const shop: ShopInfo = { name: 'ディーテック株式会社', phone: '03-0000-0000', address: 'Tokyo' };

function makeOrder(overrides: Partial<Order> = {}): Order {
    return {
        id: 'order-1',
        code: 'DH20261017-ABC123',
        locale: 'ja',
        customerEmail: 'khach@example.com',
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        paymentMethod: PaymentMethod.COD,
        subtotal: 20000,
        discount: 0,
        shippingFee: 500,
        total: 20500,
        note: null,
        cancelReason: null,
        createdAt: new Date('2026-10-17T03:00:00Z'),
        shippingAddress: {
            fullName: 'Tran <b>Phuoc</b>',
            phone: '090-1234-5678',
            street: '1-2-3 Shibuya',
            province: 'Tokyo',
        },
        items: [
            {
                id: 'p1',
                parentItemId: null,
                productName: 'Combo Dell Vostro',
                variantName: null,
                quantity: 1,
                total: 20000,
            },
            {
                id: 'c1',
                parentItemId: 'p1',
                productName: 'Chuột không dây',
                variantName: null,
                quantity: 1,
                total: 0,
            },
        ],
        ...overrides,
    } as unknown as Order;
}

describe('order mail templates', () => {
    it('escape dữ liệu khách nhập trước khi đưa vào HTML', () => {
        const mail = buildOrderPlacedMail(makeOrder(), shop);
        expect(mail.html).toContain('Tran &lt;b&gt;Phuoc&lt;/b&gt;');
        expect(mail.html).not.toContain('<b>Phuoc</b>');
    });

    it('mail gửi khách luôn bằng tiếng Nhật dù đơn đặt ở locale vi', () => {
        const placed = buildOrderPlacedMail(makeOrder({ locale: 'vi' }), shop);
        expect(placed.subject).toContain('ご注文ありがとうございます');
        const shipped = buildOrderStatusMail(
            makeOrder({ locale: 'vi' }),
            OrderStatus.SHIPPING,
            shop,
        );
        expect(shipped?.subject).toContain('商品を発送しました');
    });

    it('liệt kê thành phần combo dưới dòng cha, tổng tiền định dạng yên', () => {
        const mail = buildOrderPlacedMail(makeOrder(), shop);
        expect(mail.text).toContain('- Combo Dell Vostro × 1  ¥20,000');
        expect(mail.text).toContain('・Chuột không dây × 1');
        expect(mail.text).toContain('¥20,500');
    });

    it('không gửi mail cho trạng thái nội bộ', () => {
        expect(buildOrderStatusMail(makeOrder(), OrderStatus.PROCESSING, shop)).toBeNull();
        expect(buildOrderStatusMail(makeOrder(), OrderStatus.SHIPPING, shop)).not.toBeNull();
    });

    it('đơn đã trả tiền bị huỷ thì báo sẽ hoàn tiền, kèm lý do', () => {
        const mail = buildOrderStatusMail(
            makeOrder({
                locale: 'vi',
                status: OrderStatus.CANCELLED,
                paymentStatus: PaymentStatus.PAID,
                cancelReason: 'Hết hàng',
            }),
            OrderStatus.CANCELLED,
            shop,
        );
        expect(mail?.text).toContain('理由: Hết hàng');
        expect(mail?.text).toContain('全額返金');
    });

    it('mail báo shop có link admin khi đã cấu hình', () => {
        const mail = buildShopNewOrderMail(
            makeOrder(),
            shop,
            'https://admin.example/orders/order-1',
        );
        expect(mail.subject).toBe(
            '[Đơn mới] DH20261017-ABC123 — ¥20,500 — Thanh toán khi nhận hàng',
        );
        expect(mail.html).toContain('https://admin.example/orders/order-1');
        expect(buildShopNewOrderMail(makeOrder(), shop, null).html).not.toContain('<a href');
    });
});
