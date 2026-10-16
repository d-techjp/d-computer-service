import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { SiteSettingsModule } from '../site-settings/site-settings.module';
import { MailSender } from './infrastructure/mail.sender';
import { OrderMailListener } from './order-mail.listener';

/**
 * Email giao dịch (Resend). Nghe sự kiện của orders — orders không import
 * module này, nên thêm/bớt loại email không phải đụng vào nghiệp vụ đơn hàng.
 */
@Module({
    imports: [OrdersModule, SiteSettingsModule],
    providers: [MailSender, OrderMailListener],
    exports: [MailSender],
})
export class MailModule {}
