import type Stripe from 'stripe';

/**
 * Bật trả góp (分割払い / リボ / ボーナス払い) cho thẻ — cờ ở admin Cài đặt → Thanh toán.
 * Stripe chỉ cho chọn gói khi thẻ là thẻ tín dụng phát hành ở Nhật và khách trả bằng
 * JPY; thẻ khác vẫn trả một lần như thường. Tiền về shop đủ một lần — lãi trả góp là
 * chuyện giữa khách và công ty thẻ — nên luồng xác nhận/hoàn tiền không đổi gì.
 *
 * Danh sách phương thức (`card`, `paypay`, `alipay`) nằm ở bảng `payment_settings`,
 * xem `stripePaymentMethodTypesOf`.
 */
export function paymentMethodOptionsFor(
    cardInstallments: boolean,
): Stripe.Checkout.SessionCreateParams.PaymentMethodOptions | undefined {
    if (!cardInstallments) return undefined;
    return { card: { installments: { enabled: true } } };
}
