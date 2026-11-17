import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminPaymentSettingsController } from './admin-payment-settings.controller';
import { PaymentSettingsService } from './application/payment-settings.service';
import { PaymentSettingsRepository } from './domain/payment-settings.repository';
import { PaymentSettings } from './entities/payment-settings.entity';
import { TypeOrmPaymentSettingsRepository } from './infrastructure/typeorm-payment-settings.repository';

/**
 * Module riêng, không phụ thuộc gì: cả `cart` (preview, chặn COD) lẫn `payments`
 * (tạo phiên Stripe) cần đọc, mà payments đã import cart — để trong payments là vòng.
 */
@Module({
    imports: [TypeOrmModule.forFeature([PaymentSettings])],
    controllers: [AdminPaymentSettingsController],
    providers: [
        PaymentSettingsService,
        { provide: PaymentSettingsRepository, useClass: TypeOrmPaymentSettingsRepository },
    ],
    exports: [PaymentSettingsService],
})
export class PaymentSettingsModule {}
