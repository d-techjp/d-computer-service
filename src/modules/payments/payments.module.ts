import { Module } from '@nestjs/common';
import { CartModule } from '../cart/cart.module';
import { OrdersModule } from '../orders/orders.module';
import { StripeCheckoutService } from './application/stripe-checkout.service';
import { ClientStripeCheckoutController } from './client/client-stripe-checkout.controller';
import { StripeGateway } from './infrastructure/stripe.gateway';
import { StripeWebhookController } from './stripe-webhook.controller';

/**
 * Thanh toán online qua Stripe Checkout.
 *
 * Phụ thuộc một chiều: payments -> cart -> orders. Cart/orders không biết gì về
 * Stripe — orders chỉ có khái niệm chung "đơn chờ thanh toán" và "xác nhận đã
 * nhận tiền"; thêm cổng khác sau này cũng không phải sửa hai module đó.
 *
 * Chưa có màn quản trị riêng: hoàn tiền làm tay trên Stripe Dashboard, admin FE
 * dựng link từ `order.stripePaymentIntentId`.
 */
@Module({
    imports: [OrdersModule, CartModule],
    controllers: [ClientStripeCheckoutController, StripeWebhookController],
    providers: [StripeGateway, StripeCheckoutService],
})
export class PaymentsModule {}
