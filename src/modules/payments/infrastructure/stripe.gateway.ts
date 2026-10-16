import {
    BadGatewayException,
    Injectable,
    Logger,
    ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

/**
 * Wrapper mỏng quanh Stripe SDK — chỗ duy nhất trong code biết tới `stripe`.
 * Service nghiệp vụ chỉ gọi các hàm ở đây, không cầm SDK trực tiếp.
 *
 * Thiếu key thì vẫn boot được (giống `R2StorageService`), chỉ báo 503 khi thật
 * sự có người thanh toán online.
 */
@Injectable()
export class StripeGateway {
    private readonly logger = new Logger(StripeGateway.name);
    private readonly client: Stripe | null;
    private readonly webhookSecret: string;

    constructor(configService: ConfigService) {
        const secretKey = configService.get<string>('stripe.secretKey', '');
        this.webhookSecret = configService.get<string>('stripe.webhookSecret', '');
        this.client = secretKey ? new Stripe(secretKey) : null;

        if (!secretKey) {
            this.logger.warn('Thiếu STRIPE_SECRET_KEY — checkout chỉ còn COD');
        } else if (!this.webhookSecret) {
            this.logger.warn(
                'Thiếu STRIPE_WEBHOOK_SECRET — webhook sẽ bị từ chối, đơn Stripe chỉ được ' +
                    'xác nhận khi khách quay về trang success',
            );
        }
    }

    /** 503 nếu chưa cấu hình — gọi TRƯỚC khi tạo đơn để không sinh đơn rác. */
    assertConfigured(): void {
        this.requireClient();
    }

    async createCheckoutSession(
        params: Stripe.Checkout.SessionCreateParams,
        idempotencyKey: string,
    ): Promise<Stripe.Checkout.Session> {
        return this.call('tạo phiên thanh toán', () =>
            this.requireClient().checkout.sessions.create(params, { idempotencyKey }),
        );
    }

    async retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
        return this.call('đọc phiên thanh toán', () =>
            this.requireClient().checkout.sessions.retrieve(sessionId),
        );
    }

    /**
     * Idempotency key theo PaymentIntent: webhook gửi lại hay trang success gọi
     * trùng lúc cũng chỉ ra đúng một lần hoàn tiền.
     */
    async refundPaymentIntent(paymentIntentId: string): Promise<Stripe.Refund> {
        return this.call('hoàn tiền', () =>
            this.requireClient().refunds.create(
                { payment_intent: paymentIntentId },
                { idempotencyKey: `refund-${paymentIntentId}` },
            ),
        );
    }

    /** Ném `StripeSignatureVerificationError` nếu chữ ký sai — controller đổi thành 400. */
    constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
        if (!this.webhookSecret) {
            throw new ServiceUnavailableException('Chưa cấu hình STRIPE_WEBHOOK_SECRET');
        }
        return this.requireClient().webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    }

    private requireClient(): Stripe {
        if (!this.client) {
            throw new ServiceUnavailableException('Thanh toán online hiện chưa được bật');
        }
        return this.client;
    }

    /** Lỗi từ Stripe (mạng, key sai, phương thức chưa bật...) -> 502 kèm thông điệp gốc trong log. */
    private async call<T>(action: string, work: () => Promise<T>): Promise<T> {
        try {
            return await work();
        } catch (error) {
            if (!(error instanceof Stripe.errors.StripeError)) throw error;
            this.logger.error(`Stripe lỗi khi ${action}: [${error.type}] ${error.message}`);
            throw new BadGatewayException(`Cổng thanh toán lỗi khi ${action}, vui lòng thử lại`);
        }
    }
}
