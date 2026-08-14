import { BadRequestException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { OrdersService } from '../../orders/application/orders.service';
import type { CreateOrderDto, ShippingAddressDto } from '../../orders/dto/create-order.dto';
import type { Order } from '../../orders/entities/order.entity';
import { PaymentMethod } from '../../orders/enums/order.enum';
import type { CheckoutSummaryDto } from '../client/dto/checkout-summary.dto';
import { toPublicCart } from '../client/dto/public-cart.dto';
import type { CheckoutPreviewDto } from '../dto/checkout-preview.dto';
import type { PlaceOrderDto } from '../dto/place-order.dto';
import type { Cart } from '../entities/cart.entity';
import { CartsService } from './carts.service';

/** Chưa có mã giảm giá lẫn phí vận chuyển — giữ ở một chỗ để sau này thay bằng logic thật. */
const DISCOUNT = 0;
const SHIPPING_FEE = 0;

@Injectable()
export class CheckoutService {
    constructor(
        private readonly cartsService: CartsService,
        private readonly ordersService: OrdersService,
    ) {}

    /**
     * Tính tiền từ giỏ sau khi khách đã nhập địa chỉ. KHÔNG tạo đơn, không trừ
     * kho, không đổi gì trong DB — gọi lại bao nhiêu lần cũng được.
     */
    async preview(dto: CheckoutPreviewDto, user?: AuthenticatedUser): Promise<CheckoutSummaryDto> {
        const cart = await this.loadCheckoutableCart(dto.cartId, user);
        return this.buildPreview(cart, dto.shippingAddress);
    }

    /**
     * Đặt hàng. Tái dùng nguyên `OrdersService.create` — nơi đã có sẵn khoá
     * `FOR UPDATE`, kiểm tồn kho, bung combo, trừ kho và ghi sổ kho trong một
     * transaction. Đơn ra đời với `status = pending` (mặc định của entity).
     */
    async placeOrder(dto: PlaceOrderDto, user?: AuthenticatedUser): Promise<Order> {
        const cart = await this.loadCheckoutableCart(dto.cartId, user);

        // Chặn sớm những gì biết chắc sai (hàng ngừng bán, hết hàng) để khách nhận
        // thông báo rõ ràng thay vì lỗi cụt lủn từ tầng đặt đơn. Không thay thế
        // được kiểm tra dưới khoá của `OrdersService` — hai người cùng mua món
        // cuối cùng thì vẫn phải có một người bị từ chối ở đó.
        const preview = this.buildPreview(cart, dto.shippingAddress);
        if (!preview.canPlaceOrder) {
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
            paymentMethod: dto.paymentMethod ?? PaymentMethod.COD,
            note: dto.note,
        };

        const order = await this.ordersService.create(createOrderDto, user?.id ?? null, {
            discount: DISCOUNT,
            shippingFee: SHIPPING_FEE,
        });

        // Ngoài transaction đặt hàng: `OrdersUnitOfWork` là cửa duy nhất vào đó và
        // mở rộng nó chỉ để đóng giỏ là không đáng. Hỏng ở đây thì đơn vẫn đúng,
        // chỉ là giỏ còn mở — tồn kho vẫn được bảo vệ bởi kiểm tra dưới khoá.
        await this.cartsService.markConverted(cart, order.id);
        return order;
    }

    private async loadCheckoutableCart(cartId: string, user?: AuthenticatedUser): Promise<Cart> {
        const cart = await this.cartsService.loadAccessibleCart(cartId, user);
        if (cart.items.length === 0) {
            throw new BadRequestException('Giỏ hàng đang trống');
        }
        return cart;
    }

    private buildPreview(cart: Cart, shippingAddress: ShippingAddressDto): CheckoutSummaryDto {
        const view = toPublicCart(cart);
        const subtotal = view.subtotal;

        return {
            items: view.items,
            subtotal,
            discount: DISCOUNT,
            shippingFee: SHIPPING_FEE,
            total: Math.round((subtotal - DISCOUNT + SHIPPING_FEE) * 100) / 100,
            shippingAddress,
            paymentMethods: Object.values(PaymentMethod),
            canPlaceOrder: !view.hasBlockingIssues,
        };
    }
}
