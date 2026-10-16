import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Stripe from 'stripe';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { CheckoutService } from '../../cart/application/checkout.service';
import { OrdersService } from '../../orders/application/orders.service';
import type { Order } from '../../orders/entities/order.entity';
import { PaymentStatus } from '../../orders/enums/order.enum';
import type { OrderLocale } from '../../orders/enums/order.enum';
import type {
    StripeCheckoutDto,
    StripeCheckoutResultDto,
    StripeSessionStatusDto,
} from '../client/dto/stripe-checkout.dto';
import { StripeGateway } from '../infrastructure/stripe.gateway';

/** Cửa hàng bán ở Nhật, tài khoản Stripe ở Nhật — JPY là tiền tệ duy nhất. */
const CURRENCY = 'jpy';

/**
 * Luồng Stripe Checkout:
 *
 * 1. `startCheckout`: tạo đơn `awaiting_payment` (CHƯA trừ kho, CHƯA đóng giỏ)
 *    rồi tạo Checkout Session, trả `checkoutUrl` để FE chuyển khách sang Stripe.
 * 2. Khách trả tiền -> Stripe gọi webhook `checkout.session.completed` ->
 *    `settleSession`: trừ kho, đơn sang `pending` + `paid`, đóng giỏ. Hết hàng
 *    trong lúc khách đang trả tiền thì huỷ đơn và hoàn tiền tự động.
 * 3. Không trả (hết hạn) -> `checkout.session.expired` -> huỷ đơn. Không có gì
 *    để hoàn kho vì chưa từng trừ.
 *
 * Trang success cũng gọi `syncSession` -> `settleSession`: webhook có thể tới
 * chậm (hoặc chưa cấu hình khi chạy local), khách không nên thấy "chưa thanh
 * toán" ngay sau khi vừa trả tiền. Mọi bước đều idempotent nên hai đường cùng
 * chạy cũng không trừ kho hai lần.
 */
@Injectable()
export class StripeCheckoutService {
    private readonly logger = new Logger(StripeCheckoutService.name);
    private readonly paymentMethodTypes: string[];
    private readonly expiresMinutes: number;
    private readonly storefrontUrl: string;

    constructor(
        private readonly stripe: StripeGateway,
        private readonly checkoutService: CheckoutService,
        private readonly ordersService: OrdersService,
        configService: ConfigService,
    ) {
        this.paymentMethodTypes = configService.get<string[]>('stripe.paymentMethodTypes', [
            'card',
            'paypay',
        ]);
        this.expiresMinutes = configService.get<number>('stripe.checkoutExpiresMinutes', 30);
        this.storefrontUrl = configService.get<string>('storefront.url', '');
    }

    async startCheckout(
        dto: StripeCheckoutDto,
        user?: AuthenticatedUser,
    ): Promise<StripeCheckoutResultDto> {
        this.stripe.assertConfigured();
        const order = await this.checkoutService.placeOrderAwaitingPayment(dto, user);

        let session: Stripe.Checkout.Session;
        try {
            session = await this.stripe.createCheckoutSession(
                this.buildSessionParams(order, dto.cartId),
                `checkout-session-${order.id}`,
            );
        } catch (error) {
            // Đơn không có phiên thanh toán thì không bao giờ trả tiền được — huỷ
            // luôn để nó không nằm treo ở trang quản trị. Giỏ vẫn mở, khách thử lại.
            await this.ordersService.cancelUnpaid(
                order.id,
                'Không tạo được phiên thanh toán',
                PaymentStatus.UNPAID,
            );
            throw error;
        }

        await this.ordersService.attachStripeSession(order.id, session.id);
        if (!session.url) {
            throw new BadRequestException('Stripe không trả về đường dẫn thanh toán');
        }
        return { id: order.id, orderCode: order.code, checkoutUrl: session.url };
    }

    /** Trang success gọi sau khi Stripe chuyển khách về. */
    async syncSession(sessionId: string): Promise<StripeSessionStatusDto> {
        const session = await this.stripe.retrieveCheckoutSession(sessionId);
        const orderId = this.orderIdOf(session);
        const order = orderId ? await this.ordersService.findOne(orderId) : null;
        // Session thật của Stripe nhưng không phải của đơn nào bên mình (vd một
        // phiên khác cùng tài khoản Stripe) — đừng để nó đọc được đơn hàng.
        if (!order || order.stripeCheckoutSessionId !== session.id) {
            throw new NotFoundException('Không tìm thấy đơn hàng của phiên thanh toán này');
        }

        const settled = await this.settleSession(session);
        return this.toSessionStatus(settled ?? order);
    }

    async handleWebhookEvent(event: Stripe.Event): Promise<void> {
        switch (event.type) {
            case 'checkout.session.completed':
            case 'checkout.session.async_payment_succeeded':
                await this.settleSession(event.data.object);
                return;
            case 'checkout.session.expired':
                await this.cancelForSession(
                    event.data.object,
                    'Hết thời gian thanh toán',
                    PaymentStatus.UNPAID,
                );
                return;
            case 'checkout.session.async_payment_failed':
                await this.cancelForSession(
                    event.data.object,
                    'Thanh toán không thành công',
                    PaymentStatus.FAILED,
                );
                return;
            default:
                // Endpoint trên Dashboard nên chỉ đăng ký 4 sự kiện ở trên; sự kiện
                // lạ vẫn trả 200 để Stripe không gửi lại mãi.
                this.logger.debug(`Bỏ qua sự kiện Stripe ${event.type}`);
        }
    }

    /**
     * Ghi nhận tiền về cho đơn. Trả `null` khi phiên chưa thực sự thu được tiền
     * — `completed` với phương thức trả sau (vd konbini) có `payment_status =
     * unpaid`, tiền về sau qua `async_payment_succeeded`.
     */
    private async settleSession(session: Stripe.Checkout.Session): Promise<Order | null> {
        if (session.payment_status !== 'paid') return null;

        const orderId = this.orderIdOf(session);
        if (!orderId) {
            this.logger.warn(`Phiên Stripe ${session.id} không gắn đơn hàng nào — bỏ qua`);
            return null;
        }

        const paymentIntentId = this.paymentIntentIdOf(session);
        const { outcome, order } = await this.ordersService.confirmOnlinePayment(orderId, {
            paymentIntentId,
        });

        if (outcome === 'confirmed') {
            const cartId = session.metadata?.cartId;
            if (cartId) await this.checkoutService.closeCartForPaidOrder(cartId, order.id);
            return order;
        }

        if (outcome === 'needs_refund') {
            if (!paymentIntentId) {
                this.logger.error(
                    `Đơn ${order.code} cần hoàn tiền nhưng phiên ${session.id} không có ` +
                        'PaymentIntent — hoàn tay trên Stripe Dashboard',
                );
                return order;
            }
            this.logger.warn(`Đơn ${order.code} đã huỷ khi tiền về — hoàn tiền tự động`);
            // Lỗi ở đây ném ra ngoài -> webhook trả 5xx -> Stripe gửi lại -> thử
            // hoàn tiếp (idempotency key đảm bảo không hoàn hai lần).
            await this.stripe.refundPaymentIntent(paymentIntentId);
            return this.ordersService.markPaymentRefunded(order.id);
        }

        return order;
    }

    private async cancelForSession(
        session: Stripe.Checkout.Session,
        reason: string,
        paymentStatus: PaymentStatus,
    ): Promise<void> {
        const orderId = this.orderIdOf(session);
        if (!orderId) return;
        await this.ordersService.cancelUnpaid(orderId, reason, paymentStatus);
    }

    private buildSessionParams(order: Order, cartId: string): Stripe.Checkout.SessionCreateParams {
        const locale: OrderLocale = order.locale;
        const checkoutPath = `${this.storefrontUrl}/${locale}/checkout`;
        const metadata = { orderId: order.id, orderCode: order.code, cartId };

        return {
            mode: 'payment',
            currency: CURRENCY,
            payment_method_types: this.paymentMethodTypes,
            line_items: this.buildLineItems(order),
            client_reference_id: order.id,
            metadata,
            // Gắn cả lên PaymentIntent để tra từ trang Payments của Dashboard ra đơn
            payment_intent_data: { metadata, description: `Đơn hàng ${order.code}` },
            // Điền sẵn email khách đã nhập ở checkout — biên nhận Stripe cũng gửi về đây
            customer_email: order.customerEmail ?? undefined,
            locale,
            expires_at: Math.floor(Date.now() / 1000) + this.expiresMinutes * 60,
            // `{CHECKOUT_SESSION_ID}` là placeholder Stripe tự thay — giữ nguyên ngoặc
            success_url: `${checkoutPath}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${checkoutPath}?payment=cancelled`,
        };
    }

    /**
     * Mỗi dòng cha một line item (dòng con của combo giá 0, chỉ để trừ kho) +
     * phí ship. Có giảm giá thì gộp thành một dòng tổng: Checkout chỉ nhận giảm
     * giá qua coupon, tạo coupon cho từng đơn là thừa.
     */
    private buildLineItems(order: Order): Stripe.Checkout.SessionCreateParams.LineItem[] {
        const total = this.toYen(order.total);
        if (order.discount > 0) {
            return [this.lineItem(`Đơn hàng ${order.code}`, total, 1)];
        }

        const items = order.items
            .filter((item) => item.parentItemId === null)
            .map((item) =>
                this.lineItem(
                    item.variantName
                        ? `${item.productName} - ${item.variantName}`
                        : item.productName,
                    this.toYen(item.unitPrice),
                    item.quantity,
                    item.thumbnail,
                ),
            );
        if (order.shippingFee > 0) {
            items.push(this.lineItem('Phí vận chuyển', this.toYen(order.shippingFee), 1));
        }

        // Lệch là lỗi tính tiền ở đâu đó — thà chặn còn hơn thu sai số tiền của khách
        const sum = items.reduce(
            (acc, item) => acc + (item.price_data?.unit_amount ?? 0) * (item.quantity ?? 0),
            0,
        );
        if (sum !== total) {
            throw new BadRequestException(
                `Tổng tiền đơn ${order.code} (${total}) không khớp các dòng hàng (${sum})`,
            );
        }
        return items;
    }

    private lineItem(
        name: string,
        unitAmount: number,
        quantity: number,
        image?: string | null,
    ): Stripe.Checkout.SessionCreateParams.LineItem {
        return {
            quantity,
            price_data: {
                currency: CURRENCY,
                unit_amount: unitAmount,
                product_data: {
                    name,
                    // Stripe tự tải ảnh về — chỉ nhận URL https công khai
                    ...(image?.startsWith('https://') ? { images: [image] } : {}),
                },
            },
        };
    }

    /** JPY là zero-decimal trên Stripe: 1000 nghĩa là ¥1000, không phải ¥10. */
    private toYen(amount: number): number {
        if (!Number.isInteger(amount)) {
            throw new BadRequestException(
                `Số tiền ${amount} có phần lẻ — JPY không có đơn vị nhỏ hơn 1 yên`,
            );
        }
        return amount;
    }

    private orderIdOf(session: Stripe.Checkout.Session): string | null {
        return session.metadata?.orderId ?? session.client_reference_id ?? null;
    }

    private paymentIntentIdOf(session: Stripe.Checkout.Session): string | null {
        const intent = session.payment_intent;
        if (!intent) return null;
        return typeof intent === 'string' ? intent : intent.id;
    }

    private toSessionStatus(order: Order): StripeSessionStatusDto {
        return {
            orderCode: order.code,
            total: order.total,
            status: order.status,
            paymentStatus: order.paymentStatus,
        };
    }
}
