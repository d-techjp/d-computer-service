import { BadRequestException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { OrdersService } from '../../orders/application/orders.service';
import {
    type EffectivePaymentMethods,
    PaymentSettingsService,
} from '../../payment-settings/application/payment-settings.service';
import type { CreateOrderDto, ShippingAddressDto } from '../../orders/dto/create-order.dto';
import type { Order } from '../../orders/entities/order.entity';
import { DEFAULT_ORDER_LOCALE, PaymentMethod } from '../../orders/enums/order.enum';
import type { CheckoutSummaryDto } from '../client/dto/checkout-summary.dto';
import { toPublicCart } from '../client/dto/public-cart.dto';
import type { CheckoutPreviewDto } from '../dto/checkout-preview.dto';
import type { PlaceOrderDto } from '../dto/place-order.dto';
import type { Cart } from '../entities/cart.entity';
import { CartsService } from './carts.service';

/** Chưa có mã giảm giá lẫn phí vận chuyển — giữ ở một chỗ để sau này thay bằng logic thật. */
const DISCOUNT = 0;
const SHIPPING_FEE = 0;

/** Bỏ `paymentMethod` — luồng Stripe tự gán, khách không chọn được giá trị khác. */
export type OnlineCheckoutInput = Omit<PlaceOrderDto, 'paymentMethod'>;

@Injectable()
export class CheckoutService {
    constructor(
        private readonly cartsService: CartsService,
        private readonly ordersService: OrdersService,
        private readonly paymentSettings: PaymentSettingsService,
    ) {}

    /**
     * Tính tiền từ giỏ sau khi khách đã nhập địa chỉ. KHÔNG tạo đơn, không trừ
     * kho, không đổi gì trong DB — gọi lại bao nhiêu lần cũng được.
     */
    async preview(dto: CheckoutPreviewDto, user?: AuthenticatedUser): Promise<CheckoutSummaryDto> {
        const cart = await this.loadCheckoutableCart(dto.cartId, user);
        const methods = await this.paymentSettings.effective();
        return this.buildPreview(cart, dto.shippingAddress, methods);
    }

    /**
     * Đặt hàng. Tái dùng nguyên `OrdersService.create` — nơi đã có sẵn khoá
     * `FOR UPDATE`, kiểm tồn kho, bung combo, trừ kho và ghi sổ kho trong một
     * transaction. Đơn ra đời với `status = pending` (mặc định của entity).
     */
    async placeOrder(dto: PlaceOrderDto, user?: AuthenticatedUser): Promise<Order> {
        if (dto.paymentMethod === PaymentMethod.STRIPE) {
            throw new BadRequestException('Thanh toán online dùng POST /checkout/stripe');
        }
        const paymentMethod = dto.paymentMethod ?? PaymentMethod.COD;
        if (paymentMethod === PaymentMethod.COD) {
            const { codEnabled } = await this.paymentSettings.effective();
            if (!codEnabled) {
                throw new BadRequestException('Cửa hàng tạm ngưng nhận thanh toán khi nhận hàng');
            }
        }

        const { cart, order } = await this.createOrderFromCart({ ...dto, paymentMethod }, user);

        // Ngoài transaction đặt hàng: `OrdersUnitOfWork` là cửa duy nhất vào đó và
        // mở rộng nó chỉ để đóng giỏ là không đáng. Hỏng ở đây thì đơn vẫn đúng,
        // chỉ là giỏ còn mở — tồn kho vẫn được bảo vệ bởi kiểm tra dưới khoá.
        await this.cartsService.markConverted(cart, order.id);
        return order;
    }

    /**
     * Tạo đơn `awaiting_payment` cho thanh toán online — chưa trừ kho, và CHƯA
     * đóng giỏ: khách bấm "quay lại" trên trang Stripe thì giỏ vẫn còn nguyên để
     * thử lại. Giỏ chỉ đóng khi thanh toán thành công (`closeCartForPaidOrder`).
     */
    async placeOrderAwaitingPayment(
        dto: OnlineCheckoutInput,
        user?: AuthenticatedUser,
    ): Promise<Order> {
        const { order } = await this.createOrderFromCart(
            { ...dto, paymentMethod: PaymentMethod.STRIPE },
            user,
            { awaitingPayment: true },
        );
        return order;
    }

    /**
     * Đóng giỏ sau khi đơn online đã nhận tiền. Giỏ đã đóng, đã bị xoá, hoặc đã
     * thuộc về đơn khác thì bỏ qua — không bao giờ được làm hỏng luồng xác nhận
     * thanh toán chỉ vì cái giỏ.
     */
    async closeCartForPaidOrder(cartId: string, orderId: string): Promise<void> {
        await this.cartsService.markConvertedIfActive(cartId, orderId);
    }

    private async createOrderFromCart(
        dto: PlaceOrderDto & { paymentMethod: PaymentMethod },
        user: AuthenticatedUser | undefined,
        options: { awaitingPayment?: boolean } = {},
    ): Promise<{ cart: Cart; order: Order }> {
        const cart = await this.loadCheckoutableCart(dto.cartId, user);

        // Chặn sớm những gì biết chắc sai (hàng ngừng bán, hết hàng) để khách nhận
        // thông báo rõ ràng thay vì lỗi cụt lủn từ tầng đặt đơn. Không thay thế
        // được kiểm tra dưới khoá của `OrdersService` — hai người cùng mua món
        // cuối cùng thì vẫn phải có một người bị từ chối ở đó.
        if (toPublicCart(cart).hasBlockingIssues) {
            throw new BadRequestException(
                'Giỏ hàng có sản phẩm không còn mua được — vui lòng kiểm tra lại giỏ hàng',
            );
        }

        const createOrderDto: CreateOrderDto = {
            items: cart.items.map((item) => ({
                variantId: item.variantId,
                quantity: item.quantity,
            })),
            shippingAddress: dto.shippingAddress,
            paymentMethod: dto.paymentMethod,
            note: dto.note,
            customerEmail: dto.email,
            // Storefront chỉ còn tiếng Nhật — bỏ qua `dto.locale` (FE cũ có thể còn gửi `vi`)
            // để trang Stripe và mọi thứ dựa trên `order.locale` đều ra tiếng Nhật.
            locale: DEFAULT_ORDER_LOCALE,
        };

        const order = await this.ordersService.create(
            createOrderDto,
            user?.id ?? null,
            { discount: DISCOUNT, shippingFee: SHIPPING_FEE },
            options,
        );
        return { cart, order };
    }

    private async loadCheckoutableCart(cartId: string, user?: AuthenticatedUser): Promise<Cart> {
        const cart = await this.cartsService.loadAccessibleCart(cartId, user);
        if (cart.items.length === 0) {
            throw new BadRequestException('Giỏ hàng đang trống');
        }
        return cart;
    }

    /**
     * Chỉ trả những phương thức đặt được thật (bật trong admin Cài đặt → Thanh toán):
     * trước đây trả cả enum nên FE thấy `bank_transfer`/`e_wallet` dù backend không
     * có luồng nào cho chúng.
     */
    private availablePaymentMethods(methods: EffectivePaymentMethods): PaymentMethod[] {
        const available: PaymentMethod[] = [];
        if (methods.codEnabled) available.push(PaymentMethod.COD);
        if (methods.stripePaymentMethodTypes.length > 0) available.push(PaymentMethod.STRIPE);
        return available;
    }

    private buildPreview(
        cart: Cart,
        shippingAddress: ShippingAddressDto,
        methods: EffectivePaymentMethods,
    ): CheckoutSummaryDto {
        const view = toPublicCart(cart);
        const subtotal = view.subtotal;

        return {
            items: view.items,
            subtotal,
            discount: DISCOUNT,
            shippingFee: SHIPPING_FEE,
            total: Math.round((subtotal - DISCOUNT + SHIPPING_FEE) * 100) / 100,
            shippingAddress,
            paymentMethods: this.availablePaymentMethods(methods),
            stripePaymentMethodTypes: methods.stripePaymentMethodTypes,
            stripeCardInstallments: methods.cardInstallmentsEnabled,
            canPlaceOrder: !view.hasBlockingIssues,
        };
    }
}
