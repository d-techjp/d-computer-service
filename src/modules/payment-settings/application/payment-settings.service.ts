import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentSettingsRepository } from '../domain/payment-settings.repository';
import type { UpdatePaymentSettingsDto } from '../dto/update-payment-settings.dto';
import { PaymentSettings } from '../entities/payment-settings.entity';
import { hasAnyPaymentMethod, stripePaymentMethodTypesOf } from './payment-method-rules';

/** Những gì checkout thực sự cho khách chọn lúc này. */
export interface EffectivePaymentMethods {
    codEnabled: boolean;
    /** Rỗng khi chưa cấu hình Stripe hoặc đã tắt mọi phương thức Stripe. */
    stripePaymentMethodTypes: string[];
    cardInstallmentsEnabled: boolean;
}

/**
 * Singleton: `get` tự tạo bản ghi mặc định ở lần đọc đầu. Checkout đọc lại mỗi
 * lần (không cache) — bảng một dòng, và admin tắt PayPay thì phải có hiệu lực ngay.
 */
@Injectable()
export class PaymentSettingsService {
    constructor(
        private readonly repository: PaymentSettingsRepository,
        private readonly config: ConfigService,
    ) {}

    async get(): Promise<PaymentSettings> {
        const existing = await this.repository.find();
        if (existing) return existing;
        return this.repository.save(this.repository.create({}));
    }

    async update(dto: UpdatePaymentSettingsDto): Promise<PaymentSettings> {
        if (!hasAnyPaymentMethod(dto)) {
            throw new BadRequestException('Phải bật ít nhất một phương thức thanh toán');
        }
        const settings = await this.get();
        Object.assign(settings, dto);
        return this.repository.save(settings);
    }

    async effective(): Promise<EffectivePaymentMethods> {
        const settings = await this.get();
        // Thiếu secret key thì mọi phương thức Stripe đều không dùng được, dù DB bật
        const stripeReady = Boolean(this.config.get<string>('stripe.secretKey'));
        const types = stripeReady ? stripePaymentMethodTypesOf(settings) : [];
        return {
            codEnabled: settings.codEnabled,
            stripePaymentMethodTypes: types,
            cardInstallmentsEnabled: types.includes('card') && settings.cardInstallmentsEnabled,
        };
    }
}
