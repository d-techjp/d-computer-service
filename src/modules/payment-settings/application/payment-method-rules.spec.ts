import { hasAnyPaymentMethod, stripePaymentMethodTypesOf } from './payment-method-rules';

const off = { codEnabled: false, cardEnabled: false, paypayEnabled: false, alipayEnabled: false };

describe('payment method rules', () => {
    it('đổi cờ thành type Stripe theo thứ tự cố định', () => {
        expect(
            stripePaymentMethodTypesOf({ ...off, cardEnabled: true, alipayEnabled: true }),
        ).toEqual(['card', 'alipay']);
        expect(stripePaymentMethodTypesOf({ ...off, codEnabled: true })).toEqual([]);
    });

    it('phải còn ít nhất một phương thức', () => {
        expect(hasAnyPaymentMethod(off)).toBe(false);
        expect(hasAnyPaymentMethod({ ...off, codEnabled: true })).toBe(true);
        expect(hasAnyPaymentMethod({ ...off, paypayEnabled: true })).toBe(true);
    });
});
