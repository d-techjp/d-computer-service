import { Module } from '@nestjs/common';
import { CartModule } from '../cart/cart.module';
import { OrdersModule } from '../orders/orders.module';
import { UsersModule } from '../users/users.module';
import { AdminPosController } from './admin/admin-pos.controller';
import { PosTerminalService } from './application/pos-terminal.service';
import { StripeCheckoutService } from './application/stripe-checkout.service';
import { ClientStripeCheckoutController } from './client/client-stripe-checkout.controller';
import { StripeGateway } from './infrastructure/stripe.gateway';
import { StripeWebhookController } from './stripe-webhook.controller';

/**
 * Thanh toán qua Stripe: Checkout cho khách đặt trên web, Terminal (máy POS)
 * cho đơn tại quầy (`/admin/pos/*`).
 *
 * Phụ thuộc một chiều: payments -> cart -> orders. Cart/orders không biết gì về
 * Stripe — orders chỉ có khái niệm chung "đơn chờ thanh toán" và "xác nhận đã
 * nhận tiền"; thêm cổng khác sau này cũng không phải sửa hai module đó.
 *
 * Chưa có màn quản trị riêng: hoàn tiền làm tay trên Stripe Dashboard, admin FE
 * dựng link từ `order.stripePaymentIntentId`.
 */
@Module({
    imports: [OrdersModule, CartModule, UsersModule],
    controllers: [ClientStripeCheckoutController, StripeWebhookController, AdminPosController],
    providers: [StripeGateway, StripeCheckoutService, PosTerminalService],
})
export class PaymentsModule {}
