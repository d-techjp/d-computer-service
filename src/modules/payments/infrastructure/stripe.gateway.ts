import {
    BadGatewayException,
    ConflictException,
    Injectable,
    Logger,
    ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

const TERMINAL_ERROR_MESSAGES: Record<string, string> = {
    terminal_reader_offline: 'Máy POS đang offline — kiểm tra nguồn và kết nối mạng của máy',
    terminal_reader_busy: 'Máy POS đang bận một giao dịch khác — huỷ trên máy hoặc chờ xong',
    terminal_reader_timeout: 'Máy POS không phản hồi — thử lại sau vài giây',
};

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
    private readonly secretKey: string;

    constructor(configService: ConfigService) {
        const secretKey = configService.get<string>('stripe.secretKey', '');
        this.secretKey = secretKey;
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

    // -----------------------------------------------------------------------
    // Stripe Terminal (máy POS tại quầy)
    // -----------------------------------------------------------------------

    /** Khoá test (`sk_test_`) — chỉ khi đó mới được giả lập chạm thẻ trên reader ảo. */
    get isTestMode(): boolean {
        return this.secretKey.startsWith('sk_test_');
    }

    async createPaymentIntent(
        params: Stripe.PaymentIntentCreateParams,
        idempotencyKey: string,
    ): Promise<Stripe.PaymentIntent> {
        return this.call('tạo giao dịch', () =>
            this.requireClient().paymentIntents.create(params, { idempotencyKey }),
        );
    }

    async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
        return this.call('đọc giao dịch', () =>
            this.requireClient().paymentIntents.retrieve(paymentIntentId),
        );
    }

    async cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
        return this.call('huỷ giao dịch', () =>
            this.requireClient().paymentIntents.cancel(paymentIntentId),
        );
    }

    async listReaders(): Promise<Stripe.Terminal.Reader[]> {
        return this.call('đọc danh sách máy POS', async () => {
            const page = await this.requireClient().terminal.readers.list({ limit: 100 });
            return page.data;
        });
    }

    /** `null` khi reader đã bị xoá trên Dashboard. */
    async retrieveReader(readerId: string): Promise<Stripe.Terminal.Reader | null> {
        const reader = await this.call('đọc trạng thái máy POS', () =>
            this.requireClient().terminal.readers.retrieve(readerId),
        );
        return 'deleted' in reader && reader.deleted ? null : reader;
    }

    /** Đẩy số tiền xuống máy — máy hiện màn hình chờ khách chạm/quẹt thẻ. */
    async processPaymentIntent(
        readerId: string,
        paymentIntentId: string,
    ): Promise<Stripe.Terminal.Reader> {
        return this.call('gửi số tiền xuống máy POS', () =>
            this.requireClient().terminal.readers.processPaymentIntent(readerId, {
                payment_intent: paymentIntentId,
            }),
        );
    }

    /** Máy quay về màn hình chờ. Lỗi khi máy không có thao tác nào đang chạy — nơi gọi tự bỏ qua. */
    async cancelReaderAction(readerId: string): Promise<void> {
        await this.call('huỷ thao tác trên máy POS', () =>
            this.requireClient().terminal.readers.cancelAction(readerId),
        );
    }

    /**
     * Chỉ có trên reader ảo + khoá test: giả lập khách chạm thẻ. Thẻ
     * `4000000000000002` để thử thẻ bị từ chối.
     */
    async simulatePresentCard(readerId: string, cardNumber: string): Promise<void> {
        await this.call('giả lập chạm thẻ', () =>
            this.requireClient().testHelpers.terminal.readers.presentPaymentMethod(readerId, {
                type: 'card_present',
                card_present: { number: cardNumber },
            }),
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
            // Lỗi của máy POS là việc nhân viên tự xử lý được (bật máy, chờ máy
            // rảnh) — trả 409 kèm câu dễ hiểu thay vì 502 chung chung.
            const readerMessage = error.code ? TERMINAL_ERROR_MESSAGES[error.code] : undefined;
            if (readerMessage) throw new ConflictException(readerMessage);
            this.logger.error(`Stripe lỗi khi ${action}: [${error.type}] ${error.message}`);
            throw new BadGatewayException(`Cổng thanh toán lỗi khi ${action}, vui lòng thử lại`);
        }
    }
}
