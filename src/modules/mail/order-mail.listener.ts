import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { OrdersService } from '../orders/application/orders.service';
import type { Order } from '../orders/entities/order.entity';
import { OrderChannel, OrderStatus, PaymentStatus } from '../orders/enums/order.enum';
import {
    ORDER_EVENTS,
    OrderPlacedEvent,
    OrderStatusChangedEvent,
} from '../orders/events/order.events';
import { SiteSettingsService } from '../site-settings/application/site-settings.service';
import { MailSender } from './infrastructure/mail.sender';
import {
    buildOrderPlacedMail,
    buildOrderStatusMail,
    buildShopNewOrderMail,
    CUSTOMER_NOTIFIED_STATUSES,
    type ShopInfo,
} from './templates/order-mail.templates';

/**
 * Gửi email theo sự kiện đơn hàng. Chạy `async` sau khi response đã trả về —
 * khách không phải chờ gửi mail, và mọi lỗi đều bị nuốt + log tại đây.
 */
@Injectable()
export class OrderMailListener {
    private readonly logger = new Logger(OrderMailListener.name);
    private readonly shopNotifyEmails: string[];
    private readonly adminUrl: string;

    constructor(
        private readonly mail: MailSender,
        private readonly ordersService: OrdersService,
        private readonly siteSettingsService: SiteSettingsService,
        configService: ConfigService,
    ) {
        this.shopNotifyEmails = configService.get<string[]>('mail.shopNotifyEmails', []);
        this.adminUrl = configService.get<string>('mail.adminUrl', '');
    }

    @OnEvent(ORDER_EVENTS.PLACED, { async: true })
    async onOrderPlaced(event: OrderPlacedEvent): Promise<void> {
        await this.safely(`đơn ${event.orderId} đã đặt`, async () => {
            const order = await this.ordersService.findOne(event.orderId);
            const shop = await this.shopInfo();

            if (order.customerEmail) {
                await this.mail.send({
                    to: order.customerEmail,
                    ...buildOrderPlacedMail(order, shop),
                    idempotencyKey: `order-placed-${order.id}`,
                });
            }
            // Đơn tại quầy do chính nhân viên vừa lên — báo "có đơn mới" là thừa
            if (this.shopNotifyEmails.length > 0 && order.channel !== OrderChannel.IN_STORE) {
                await this.mail.send({
                    to: this.shopNotifyEmails,
                    ...buildShopNewOrderMail(order, shop, this.adminOrderUrl(order)),
                    idempotencyKey: `order-placed-shop-${order.id}`,
                });
            }
        });
    }

    @OnEvent(ORDER_EVENTS.STATUS_CHANGED, { async: true })
    async onStatusChanged(event: OrderStatusChangedEvent): Promise<void> {
        if (!CUSTOMER_NOTIFIED_STATUSES.includes(event.to)) return;

        await this.safely(`đơn ${event.orderId} -> ${event.to}`, async () => {
            const order = await this.ordersService.findOne(event.orderId);
            if (!order.customerEmail) return;
            // Đơn online bị huỷ khi chưa trả tiền (hết hạn, admin huỷ): khách chưa
            // từng nhận xác nhận đặt hàng, báo "đã huỷ" chỉ gây hoang mang.
            if (event.from === OrderStatus.AWAITING_PAYMENT && !this.wasPaid(order)) return;

            const content = buildOrderStatusMail(order, event.to, await this.shopInfo());
            if (!content) return;

            await this.mail.send({
                to: order.customerEmail,
                ...content,
                idempotencyKey: `order-status-${order.id}-${event.to}`,
            });
        });
    }

    private wasPaid(order: Order): boolean {
        return (
            order.paymentStatus === PaymentStatus.PAID ||
            order.paymentStatus === PaymentStatus.REFUNDED
        );
    }

    private adminOrderUrl(order: Order): string | null {
        return this.adminUrl ? `${this.adminUrl}/orders/${order.id}` : null;
    }

    private async shopInfo(): Promise<ShopInfo> {
        const settings = await this.siteSettingsService.get();
        return { name: settings.companyName, phone: settings.phone, address: settings.address };
    }

    private async safely(label: string, work: () => Promise<void>): Promise<void> {
        if (!this.mail.enabled) return;
        try {
            await work();
        } catch (error) {
            this.logger.error(
                `Không gửi được email cho ${label}: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }
}
