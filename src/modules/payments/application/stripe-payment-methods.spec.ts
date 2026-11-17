import { paymentMethodOptionsFor } from './stripe-payment-methods';

describe('paymentMethodOptionsFor', () => {
    it('bật trả góp cho thẻ khi admin bật', () => {
        expect(paymentMethodOptionsFor(true)).toEqual({
            card: { installments: { enabled: true } },
        });
    });

    it('không gửi tuỳ chọn thẻ khi tắt trả góp (hoặc tắt thẻ)', () => {
        expect(paymentMethodOptionsFor(false)).toBeUndefined();
    });
});
