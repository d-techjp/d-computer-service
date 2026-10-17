import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Stripe from 'stripe';
import { OrdersService } from '../../orders/application/orders.service';
import { UsersService } from '../../users/application/users.service';
import type { Order } from '../../orders/entities/order.entity';
import {
    OrderChannel,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
} from '../../orders/enums/order.enum';
import type {
    CancelPosOrderDto,
    CreatePosOrderDto,
    PosCustomerDto,
    PosPaymentStatusDto,
    PosReaderActionDto,
    PosReadersDto,
} from '../admin/dto/pos.dto';
import { StripeGateway } from '../infrastructure/stripe.gateway';

const CURRENCY = 'jpy';
/** Đánh dấu PaymentIntent của máy POS — webhook dựa vào đây để không đụng PI của Checkout. */
const POS_CHANNEL_METADATA: string = OrderChannel.IN_STORE;
const DEFAULT_TEST_CARD = '4242424242424242';
const WALK_IN_CUSTOMER = '店頭のお客様';

/**
 * Bán tại quầy, thu tiền qua máy POS Stripe Terminal (server-driven):
 *
 * 1. `createOrder`: nhân viên lên đơn -> đơn `in_store` + `awaiting_payment`,
 *    CHƯA trừ kho (giống đơn Stripe Checkout).
 * 2. `collect`: tạo PaymentIntent `card_present` rồi đẩy xuống máy — máy hiện
 *    số tiền, khách chạm/quẹt/cắm thẻ.
 * 3. Tiền về -> webhook `payment_intent.succeeded` -> `confirmOnlinePayment`:
 *    trừ kho, đơn sang `completed` + `paid` luôn (khách cầm hàng về).
 *
 * Admin poll `status` trong lúc chờ. `status` cũng tự đối soát với Stripe nên
 * khi chạy local chưa bật `stripe listen` đơn vẫn chốt được.
 *
 * Thẻ bị từ chối KHÔNG huỷ đơn: PaymentIntent quay về `requires_payment_method`,
 * máy báo lỗi, nhân viên bấm thu lại (cùng PI) hoặc huỷ đơn.
 */
@Injectable()
export class PosTerminalService {
    private readonly logger = new Logger(PosTerminalService.name);
    private readonly defaultReaderId: string;

    constructor(
        private readonly stripe: StripeGateway,
        private readonly ordersService: OrdersService,
        private readonly usersService: UsersService,
        configService: ConfigService,
    ) {
        this.defaultReaderId = configService.get<string>('stripe.terminalReaderId', '');
    }

    async listReaders(): Promise<PosReadersDto> {
        const readers = await this.stripe.listReaders();
        return {
            readers: readers.map((reader) => ({
                id: reader.id,
                label: reader.label ?? null,
                deviceType: reader.device_type,
                status: reader.status ?? null,
                simulated: reader.device_type.startsWith('simulated_'),
            })),
            defaultReaderId: this.defaultReaderId || null,
            testMode: this.stripe.isTestMode,
        };
    }

    async searchCustomers(phone: string): Promise<PosCustomerDto[]> {
        const users = await this.usersService.searchCustomersByPhone(phone);
        return users.map((user) => ({
            id: user.id,
            fullName: user.fullName,
            phone: user.phone,
            email: user.email,
        }));
    }

    /**
     * Máy POS: đơn chờ thu tiền (bước `collect`). Tiền mặt / chuyển khoản: nhân
     * viên đã cầm tiền nên đơn hoàn tất ngay trong lần gọi này.
     */
    async createOrder(dto: CreatePosOrderDto): Promise<Order> {
        const paymentMethod = dto.paymentMethod ?? PaymentMethod.STRIPE_TERMINAL;
        const viaTerminal = paymentMethod === PaymentMethod.STRIPE_TERMINAL;
        // Chưa cấu hình Stripe thì không thu được tiền — chặn trước khi sinh đơn rác
        if (viaTerminal) this.stripe.assertConfigured();
        const customerId = await this.resolveCustomerId(dto);
        return this.ordersService.create(
            {
                items: dto.items,
                paymentMethod,
                shippingAddress: {
                    fullName: dto.customerName || WALK_IN_CUSTOMER,
                    phone: dto.customerPhone ?? '',
                    street: '',
                    province: '',
                },
                customerEmail: dto.customerEmail,
                note: dto.note,
                locale: 'ja',
            },
            customerId,
            { discount: dto.discount ?? 0, shippingFee: 0 },
            { awaitingPayment: viaTerminal, channel: OrderChannel.IN_STORE },
        );
    }

    /**
     * Khách cho đơn: chọn sẵn từ gợi ý, hoặc tìm/tạo theo số điện thoại. Không có
     * số điện thoại thì là khách vãng lai, đơn không gắn tài khoản nào.
     */
    private async resolveCustomerId(dto: CreatePosOrderDto): Promise<string | null> {
        if (dto.customerId) return (await this.usersService.findCustomer(dto.customerId)).id;
        if (!dto.customerPhone?.replace(/\D/g, '')) return null;

        const { user, created } = await this.usersService.findOrCreateCustomerByPhone({
            phone: dto.customerPhone,
            fullName: dto.customerName,
            email: dto.customerEmail,
        });
        if (created) this.logger.log(`Tạo khách mới ${user.username} từ đơn tại quầy`);
        return user.id;
    }

    /** Đẩy số tiền của đơn xuống máy POS. Gọi lại được sau khi thẻ bị từ chối / huỷ trên máy. */
    async collect(orderId: string, readerIdInput?: string): Promise<PosPaymentStatusDto> {
        const readerId = this.resolveReaderId(readerIdInput);
        const order = await this.loadPosOrder(orderId);
        if (order.status !== OrderStatus.AWAITING_PAYMENT) {
            throw new BadRequestException(`Đơn ${order.code} không còn chờ thanh toán`);
        }

        let intent = order.stripePaymentIntentId
            ? await this.stripe.retrievePaymentIntent(order.stripePaymentIntentId)
            : null;

        // Webhook chưa tới nhưng thực ra đã trả xong — chốt luôn, đừng thu lần hai
        if (intent?.status === 'succeeded') {
            const settled = await this.settlePaymentIntent(intent);
            return this.toStatus(settled ?? order, readerId, null);
        }
        if (intent?.status === 'processing') {
            throw new ConflictException(
                'Giao dịch trước đang được xử lý — chờ vài giây rồi xem lại',
            );
        }
        if (!intent || intent.status === 'canceled') {
            intent = await this.stripe.createPaymentIntent(
                {
                    amount: this.toYen(order.total),
                    currency: CURRENCY,
                    payment_method_types: ['card_present'],
                    capture_method: 'automatic',
                    description: `Đơn tại quầy ${order.code}`,
                    metadata: {
                        orderId: order.id,
                        orderCode: order.code,
                        channel: POS_CHANNEL_METADATA,
                    },
                },
                // Khoá theo PI cũ: gọi trùng thì ra cùng một PI, PI cũ bị huỷ thì ra PI mới
                `pos-payment-intent-${order.id}-${order.stripePaymentIntentId ?? 'first'}`,
            );
            await this.ordersService.attachPaymentIntent(order.id, intent.id);
        }

        const reader = await this.stripe.processPaymentIntent(readerId, intent.id);
        return this.toStatus(
            { ...order, stripePaymentIntentId: intent.id },
            readerId,
            this.actionFor(reader, intent.id),
        );
    }

    /** Admin poll trong lúc chờ khách chạm thẻ. */
    async status(orderId: string, readerIdInput?: string): Promise<PosPaymentStatusDto> {
        let order = await this.loadPosOrder(orderId);
        const readerId = readerIdInput || this.defaultReaderId || null;

        if (order.status === OrderStatus.AWAITING_PAYMENT && order.stripePaymentIntentId) {
            const intent = await this.stripe.retrievePaymentIntent(order.stripePaymentIntentId);
            if (intent.status === 'succeeded') {
                order = (await this.settlePaymentIntent(intent)) ?? order;
            }
        }

        let action: PosReaderActionDto | null = null;
        if (
            readerId &&
            order.status === OrderStatus.AWAITING_PAYMENT &&
            order.stripePaymentIntentId
        ) {
            const reader = await this.stripe.retrieveReader(readerId);
            action = reader ? this.actionFor(reader, order.stripePaymentIntentId) : null;
        }
        return this.toStatus(order, readerId, action);
    }

    /** Máy quay về màn hình chờ, đơn vẫn chờ thanh toán (thu lại hoặc đổi máy được). */
    async cancelCollect(orderId: string, readerIdInput?: string): Promise<PosPaymentStatusDto> {
        const readerId = this.resolveReaderId(readerIdInput);
        await this.loadPosOrder(orderId);
        await this.cancelReaderActionQuietly(readerId);
        return this.status(orderId, readerId);
    }

    /**
     * Huỷ hẳn đơn chưa trả tiền: dừng máy, huỷ PaymentIntent, huỷ đơn. Nếu Stripe
     * báo PI đã thành công thì KHÔNG huỷ — chốt đơn và báo 409 cho nhân viên biết.
     */
    async cancelOrder(orderId: string, dto: CancelPosOrderDto): Promise<PosPaymentStatusDto> {
        const order = await this.loadPosOrder(orderId);
        if (order.status !== OrderStatus.AWAITING_PAYMENT) {
            throw new BadRequestException(
                `Đơn ${order.code} không còn chờ thanh toán — huỷ/hoàn tiền ở trang đơn hàng`,
            );
        }

        const readerId = dto.readerId || this.defaultReaderId;
        if (readerId) await this.cancelReaderActionQuietly(readerId);

        if (order.stripePaymentIntentId) {
            const intent = await this.stripe.retrievePaymentIntent(order.stripePaymentIntentId);
            if (intent.status === 'succeeded') {
                await this.settlePaymentIntent(intent);
                throw new ConflictException(
                    `Khách đã thanh toán xong đơn ${order.code} — không huỷ được, hãy hoàn tiền nếu cần`,
                );
            }
            if (intent.status !== 'canceled') {
                await this.stripe.cancelPaymentIntent(intent.id);
            }
        }

        const cancelled = await this.ordersService.cancelUnpaid(
            order.id,
            dto.reason || 'Huỷ tại quầy',
            PaymentStatus.UNPAID,
        );
        return this.toStatus(cancelled, readerId || null, null);
    }

    /** Chỉ sandbox: giả lập khách chạm thẻ trên reader ảo. */
    async simulateTap(
        orderId: string,
        readerIdInput?: string,
        cardNumber?: string,
    ): Promise<PosPaymentStatusDto> {
        if (!this.stripe.isTestMode) {
            throw new BadRequestException('Chỉ giả lập được khi dùng khoá Stripe test');
        }
        const readerId = this.resolveReaderId(readerIdInput);
        await this.loadPosOrder(orderId);
        await this.stripe.simulatePresentCard(readerId, cardNumber ?? DEFAULT_TEST_CARD);
        return this.status(orderId, readerId);
    }

    /** Webhook. Bỏ qua PI không phải của máy POS (PI của Stripe Checkout cũng bắn sự kiện này). */
    async handleWebhookEvent(event: Stripe.Event): Promise<boolean> {
        if (event.type !== 'payment_intent.succeeded') return false;
        const intent = event.data.object;
        if (intent.metadata?.channel !== POS_CHANNEL_METADATA) return false;
        await this.settlePaymentIntent(intent);
        return true;
    }

    /** Cùng nghiệp vụ với Checkout: trừ kho, hết hàng thì huỷ + hoàn tiền tự động. */
    private async settlePaymentIntent(intent: Stripe.PaymentIntent): Promise<Order | null> {
        if (intent.status !== 'succeeded') return null;
        const orderId = intent.metadata?.orderId;
        if (!orderId) {
            this.logger.warn(`PaymentIntent ${intent.id} không gắn đơn hàng nào — bỏ qua`);
            return null;
        }

        const { outcome, order } = await this.ordersService.confirmOnlinePayment(orderId, {
            paymentIntentId: intent.id,
        });
        if (outcome !== 'needs_refund') return order;

        this.logger.warn(
            `Đơn tại quầy ${order.code} không nhận được khi tiền về — hoàn tiền tự động`,
        );
        await this.stripe.refundPaymentIntent(intent.id);
        return this.ordersService.markPaymentRefunded(order.id);
    }

    private async loadPosOrder(orderId: string): Promise<Order> {
        const order = await this.ordersService.findOne(orderId);
        if (order.channel !== OrderChannel.IN_STORE) {
            throw new BadRequestException(`Đơn ${order.code} không phải đơn tại quầy`);
        }
        return order;
    }

    private resolveReaderId(readerId?: string): string {
        const resolved = readerId || this.defaultReaderId;
        if (!resolved) {
            throw new BadRequestException(
                'Chưa chọn máy POS — chọn máy trên màn hình hoặc cấu hình STRIPE_TERMINAL_READER_ID',
            );
        }
        return resolved;
    }

    /** Máy không có thao tác nào để huỷ thì Stripe báo lỗi — với nơi gọi, kết quả vẫn là "máy rảnh". */
    private async cancelReaderActionQuietly(readerId: string): Promise<void> {
        try {
            await this.stripe.cancelReaderAction(readerId);
        } catch (error) {
            this.logger.debug(
                `Bỏ qua lỗi huỷ thao tác máy ${readerId}: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    /** Chỉ báo thao tác của máy khi nó đang xử lý đúng PaymentIntent của đơn này. */
    private actionFor(
        reader: Stripe.Terminal.Reader,
        paymentIntentId: string,
    ): PosReaderActionDto | null {
        const action = reader.action;
        const intent = action?.process_payment_intent?.payment_intent;
        const intentId = typeof intent === 'string' ? intent : intent?.id;
        if (!action || intentId !== paymentIntentId) return null;
        return { status: action.status, failureMessage: action.failure_message ?? null };
    }

    private toStatus(
        order: Order,
        readerId: string | null,
        readerAction: PosReaderActionDto | null,
    ): PosPaymentStatusDto {
        return {
            id: order.id,
            orderCode: order.code,
            total: order.total,
            status: order.status,
            paymentStatus: order.paymentStatus,
            paymentIntentId: order.stripePaymentIntentId,
            readerId,
            readerAction,
        };
    }

    /** JPY là zero-decimal trên Stripe: 1000 nghĩa là ¥1000. */
    private toYen(amount: number): number {
        if (!Number.isInteger(amount)) {
            throw new BadRequestException(
                `Số tiền ${amount} có phần lẻ — JPY không có đơn vị nhỏ hơn 1 yên`,
            );
        }
        return amount;
    }
}
