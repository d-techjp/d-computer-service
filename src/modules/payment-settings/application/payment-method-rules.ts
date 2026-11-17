import type { PaymentSettings } from '../entities/payment-settings.entity';

type MethodFlags = Pick<
    PaymentSettings,
    'codEnabled' | 'cardEnabled' | 'paypayEnabled' | 'alipayEnabled'
>;

/**
 * Cờ trong DB -> `payment_method_types` của Stripe Checkout. Không có type riêng
 * cho JCB / Apple Pay / Google Pay: cả ba đi qua `card` (hãng thẻ / ví chứa thẻ).
 */
export function stripePaymentMethodTypesOf(flags: MethodFlags): string[] {
    const types: string[] = [];
    if (flags.cardEnabled) types.push('card');
    if (flags.paypayEnabled) types.push('paypay');
    if (flags.alipayEnabled) types.push('alipay');
    return types;
}

/** Tắt hết thì checkout không còn cách nào trả tiền — chặn ngay lúc lưu. */
export function hasAnyPaymentMethod(flags: MethodFlags): boolean {
    return flags.codEnabled || stripePaymentMethodTypesOf(flags).length > 0;
}
