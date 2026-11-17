import type { PaymentSettings } from '../entities/payment-settings.entity';

/** Port cho persistence của PaymentSettings — bảng tối đa một dòng (singleton). */
export abstract class PaymentSettingsRepository {
    abstract create(data: Partial<PaymentSettings>): PaymentSettings;

    abstract save(settings: PaymentSettings): Promise<PaymentSettings>;

    /** `null` nếu bảng chưa có dòng nào. */
    abstract find(): Promise<PaymentSettings | null>;
}
