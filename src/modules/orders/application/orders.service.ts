import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'node:crypto';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import { PermissionCode } from '../../../common/enums/permission.enum';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import {
    InventoryReasonCode,
    InventoryReferenceType,
    InventoryTransactionType,
} from '../../inventory/enums/inventory.enum';
import {
    BundleInventoryPolicy,
    type ProductVariant,
} from '../../products/entities/product-variant.entity';
import { ProductStatus } from '../../products/entities/product.entity';
import { ProductBundlesService } from '../../products/application/product-bundles.service';
import { UserPermissionsService } from '../../rbac/user-permissions.service';
import { OrdersRepository, type OrdersUnitOfWork } from '../domain/orders.repository';
import type { CreateOrderDto } from '../dto/create-order.dto';
import type { QueryOrderDto } from '../dto/query-order.dto';
import { OrderItem } from '../entities/order-item.entity';
import { Order } from '../entities/order.entity';
import {
    DEFAULT_ORDER_LOCALE,
    ORDER_STATUS_TRANSITIONS,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
    STOCK_RESERVED_STATUSES,
} from '../enums/order.enum';
import { ORDER_EVENTS, OrderPlacedEvent, OrderStatusChangedEvent } from '../events/order.events';

const CODE_RETRY_LIMIT = 5;

/**
 * - `confirmed`: vừa trừ kho, đơn sang `pending` + `paid`.
 * - `needs_refund`: tiền về nhưng đơn không nhận được (đã huỷ/hết hạn, hoặc hết
 *   hàng) — nơi gọi phải hoàn tiền rồi gọi `markPaymentRefunded`.
 * - `ignored`: đã xử lý trước đó (webhook gửi lại) — không làm gì.
 */
export type OnlinePaymentOutcome = 'confirmed' | 'needs_refund' | 'ignored';

@Injectable()
export class OrdersService {
    constructor(
        private readonly ordersRepository: OrdersRepository,
        private readonly userPermissionsService: UserPermissionsService,
        private readonly bundlesService: ProductBundlesService,
        private readonly events: EventEmitter2,
    ) {}

    /**
     * Tạo đơn trong một transaction: khoá biến thể (FOR UPDATE), kiểm tra tồn
     * kho, trừ kho rồi mới ghi đơn. Hai request mua cùng lúc không thể bán vượt kho.
     *
     * Combo `derived_from_components` được bung thành dòng cha (mang doanh thu)
     * + dòng con cho từng thành phần (`unitPrice = 0`), và CHỈ trừ kho thành
     * phần — trừ cả hai sẽ làm hụt kho gấp đôi. Combo `own_stock` là kit đóng
     * sẵn nên trừ thẳng kho của chính nó, không đụng thành phần.
     *
     * `pricing` là tham số của SERVER, không phải input của khách: `discount` và
     * `shippingFee` từng nằm trong `CreateOrderDto` nên khách tự gửi lên được và
     * tự giảm giá đơn của mình. Chỗ gọi nào có logic tính tiền (checkout, sau này
     * là coupon/phí ship) thì truyền vào đây; mặc định là không giảm, không phí.
     *
     * `awaitingPayment`: đơn thanh toán online — vẫn kiểm tra đủ hàng (để khách
     * biết ngay nếu hết), nhưng CHƯA trừ kho; đơn ra đời ở `awaiting_payment` và
     * chỉ trừ kho khi `confirmOnlinePayment` chạy. Bắt buộc đi cặp với
     * `PaymentMethod.STRIPE`: tạo đơn Stripe mà không qua cổng thanh toán (vd
     * `POST /orders`) sẽ ra đơn `pending` chưa ai trả tiền.
     */
    async create(
        dto: CreateOrderDto,
        userId: string | null,
        pricing: { discount: number; shippingFee: number } = { discount: 0, shippingFee: 0 },
        options: { awaitingPayment?: boolean } = {},
    ): Promise<Order> {
        const awaitingPayment = options.awaitingPayment ?? false;
        if ((dto.paymentMethod === PaymentMethod.STRIPE) !== awaitingPayment) {
            throw new BadRequestException(
                'Thanh toán Stripe phải tạo đơn qua POST /checkout/stripe',
            );
        }
        const reserveStock = !awaitingPayment;

        const { order, touchedComponentIds } = await this.ordersRepository.runTransaction(
            async (uow) => {
                const requestedIds = dto.items.map((item) => item.variantId);

                // Đọc cấu trúc combo TRƯỚC khi khoá, để chỉ khoá đúng một lần theo
                // thứ tự id tăng dần. Khoá hai pha (khoá combo -> đọc -> khoá thành
                // phần) sẽ deadlock khi hai đơn chứa combo giao nhau.
                const bundleItems = await uow.findBundleItems(requestedIds);
                const componentsByBundle = new Map<string, typeof bundleItems>();
                for (const item of bundleItems) {
                    const group = componentsByBundle.get(item.bundleVariantId) ?? [];
                    group.push(item);
                    componentsByBundle.set(item.bundleVariantId, group);
                }

                const variants = await uow.lockVariants([
                    ...requestedIds,
                    ...bundleItems.map((item) => item.componentVariantId),
                ]);

                const parentItems: OrderItem[] = [];
                const childItems: OrderItem[] = [];
                const touchedProductIds = new Set<string>();
                const touchedComponentIds = new Set<string>();
                // Ghi sổ kho cần orderId — order chỉ có id sau `saveOrder`, nên
                // gom lại đây rồi ghi hàng loạt bên dưới, vẫn trong cùng transaction.
                const stockMovements: Array<{
                    variantId: string;
                    quantity: number;
                    stockBefore: number;
                    stockAfter: number;
                }> = [];
                let subtotal = 0;

                for (const input of dto.items) {
                    const variant = variants.get(input.variantId);
                    if (!variant) {
                        throw new NotFoundException(`Không tìm thấy biến thể ${input.variantId}`);
                    }
                    this.assertSellable(variant);

                    const lineTotal = this.round(variant.price * input.quantity);
                    subtotal += lineTotal;

                    // Id gán sẵn để dòng con biết cha là ai mà không phải chờ lượt
                    // lưu đầu tiên trả về rồi dò ngược.
                    const parentId = randomUUID();
                    parentItems.push(
                        uow.createOrderItem({
                            id: parentId,
                            productId: variant.productId,
                            variantId: variant.id,
                            productName: variant.product.name,
                            variantName: variant.name,
                            sku: variant.sku,
                            thumbnail: variant.thumbnail ?? variant.product.thumbnail,
                            unitPrice: variant.price,
                            quantity: input.quantity,
                            total: lineTotal,
                        }),
                    );
                    touchedProductIds.add(variant.productId);

                    if (this.isDerivedBundle(variant)) {
                        const components = componentsByBundle.get(variant.id) ?? [];
                        if (components.length === 0) {
                            throw new BadRequestException(
                                `Combo "${variant.product.name}" chưa khai thành phần`,
                            );
                        }

                        for (const component of components) {
                            const componentVariant = variants.get(component.componentVariantId);
                            if (!componentVariant) {
                                throw new BadRequestException(
                                    `Thành phần của combo "${variant.product.name}" không còn tồn tại`,
                                );
                            }

                            const needed = component.quantity * input.quantity;
                            const enough =
                                !componentVariant.trackInventory ||
                                componentVariant.stock >= needed;

                            if (!enough) {
                                // Quà tặng kèm hết hàng thì bỏ qua, không chặn cả đơn.
                                if (component.isOptional) continue;
                                throw new BadRequestException(
                                    `Combo "${variant.product.name}" không đủ hàng: thành phần ` +
                                        `"${componentVariant.sku}" chỉ còn ${componentVariant.stock}, ` +
                                        `cần ${needed}`,
                                );
                            }

                            childItems.push(
                                uow.createOrderItem({
                                    parentItemId: parentId,
                                    productId: componentVariant.productId,
                                    variantId: componentVariant.id,
                                    productName: componentVariant.product.name,
                                    variantName: componentVariant.name,
                                    sku: componentVariant.sku,
                                    thumbnail: componentVariant.thumbnail,
                                    unitPrice: 0,
                                    quantity: needed,
                                    total: 0,
                                }),
                            );

                            if (!reserveStock) continue;

                            const componentStockBefore = componentVariant.stock;
                            this.consumeStock(componentVariant, needed);
                            await uow.saveVariant(componentVariant);
                            if (componentVariant.trackInventory) {
                                stockMovements.push({
                                    variantId: componentVariant.id,
                                    quantity: needed,
                                    stockBefore: componentStockBefore,
                                    stockAfter: componentVariant.stock,
                                });
                            }
                            touchedProductIds.add(componentVariant.productId);
                            touchedComponentIds.add(componentVariant.id);
                        }
                    } else {
                        this.assertStockEnough(variant, input.quantity);
                        if (reserveStock) {
                            const stockBefore = variant.stock;
                            this.consumeStock(variant, input.quantity);
                            if (variant.trackInventory) {
                                stockMovements.push({
                                    variantId: variant.id,
                                    quantity: input.quantity,
                                    stockBefore,
                                    stockAfter: variant.stock,
                                });
                            }
                        }
                    }

                    if (reserveStock) {
                        variant.soldCount += input.quantity;
                        await uow.saveVariant(variant);
                    }
                }

                subtotal = this.round(subtotal);
                const discount = this.round(pricing.discount);
                const shippingFee = this.round(pricing.shippingFee);

                if (discount > subtotal) {
                    throw new BadRequestException('Giảm giá không được lớn hơn tổng tiền hàng');
                }

                const saved = await uow.saveOrder(
                    uow.createOrder({
                        code: await this.generateCode(uow),
                        userId,
                        status: awaitingPayment
                            ? OrderStatus.AWAITING_PAYMENT
                            : OrderStatus.PENDING,
                        paymentStatus: PaymentStatus.UNPAID,
                        paymentMethod: dto.paymentMethod ?? PaymentMethod.COD,
                        subtotal,
                        discount,
                        shippingFee,
                        total: this.round(subtotal - discount + shippingFee),
                        shippingAddress: dto.shippingAddress,
                        note: dto.note ?? null,
                        customerEmail: dto.customerEmail ?? null,
                        locale: dto.locale ?? DEFAULT_ORDER_LOCALE,
                        items: parentItems,
                    }),
                );

                for (const child of childItems) child.orderId = saved.id;
                await uow.saveOrderItems(childItems);
                if (reserveStock) await uow.refreshProductAggregates([...touchedProductIds]);

                for (const movement of stockMovements) {
                    await uow.recordInventoryMovement({
                        variantId: movement.variantId,
                        type: InventoryTransactionType.OUT,
                        reasonCode: InventoryReasonCode.ORDER_SALE,
                        quantity: movement.quantity,
                        stockBefore: movement.stockBefore,
                        stockAfter: movement.stockAfter,
                        referenceType: InventoryReferenceType.ORDER,
                        referenceId: saved.id,
                        performedById: userId,
                        note: saved.code,
                    });
                }

                return { order: saved, touchedComponentIds: [...touchedComponentIds] };
            },
        );

        // Kho thành phần đổi -> tồn kho cache của các combo chứa nó không còn đúng.
        // Chạy sau khi commit: bản cache chỉ phục vụ hiển thị, còn kiểm tra bán
        // vượt kho đã làm dưới khoá ở trên nên không phụ thuộc vào nó.
        await this.bundlesService.refreshBundlesContaining(touchedComponentIds);
        // Đơn online chưa trả tiền chưa phải đơn "đã đặt" — phát khi thanh toán xong
        if (!awaitingPayment) {
            this.events.emit(ORDER_EVENTS.PLACED, new OrderPlacedEvent(order.id));
        }
        return order;
    }

    async findAll(query: QueryOrderDto): Promise<PaginatedResult<Order>> {
        const page = await this.ordersRepository.search(query);
        return new PaginatedResult(page.items, page.total, query.page, query.limit);
    }

    async findOne(id: string): Promise<Order> {
        const order = await this.ordersRepository.findById(id);
        if (!order) throw new NotFoundException(`Không tìm thấy đơn hàng với id ${id}`);
        return order;
    }

    async findByCode(code: string): Promise<Order> {
        const order = await this.ordersRepository.findByCode(code);
        if (!order) throw new NotFoundException(`Không tìm thấy đơn hàng với mã ${code}`);
        return order;
    }

    /** Khách chỉ xem được đơn của chính mình; ai có quyền quản lý đơn xem được tất cả. */
    async findOneForUser(id: string, user: AuthenticatedUser): Promise<Order> {
        const order = await this.findOne(id);
        if (!(await this.canManageOrders(user)) && order.userId !== user.id) {
            throw new ForbiddenException('Bạn không có quyền xem đơn hàng này');
        }
        return order;
    }

    /**
     * Đổi trạng thái theo máy trạng thái. Khi huỷ đơn thì hoàn kho trong cùng transaction.
     */
    async updateStatus(
        id: string,
        nextStatus: OrderStatus,
        reason?: string,
        performedById: string | null = null,
    ): Promise<Order> {
        const { order, previousStatus, restoredComponentIds } =
            await this.ordersRepository.runTransaction(async (uow) =>
                this.applyStatusTransition(uow, id, nextStatus, reason, performedById),
            );

        await this.bundlesService.refreshBundlesContaining(restoredComponentIds);
        this.events.emit(
            ORDER_EVENTS.STATUS_CHANGED,
            new OrderStatusChangedEvent(order.id, previousStatus, order.status),
        );
        return order;
    }

    private async applyStatusTransition(
        uow: OrdersUnitOfWork,
        id: string,
        nextStatus: OrderStatus,
        reason?: string,
        performedById: string | null = null,
    ): Promise<{ order: Order; previousStatus: OrderStatus; restoredComponentIds: string[] }> {
        const order = await uow.lockOrder(id);
        if (!order) throw new NotFoundException(`Không tìm thấy đơn hàng với id ${id}`);

        this.assertTransitionAllowed(order.status, nextStatus);
        const previousStatus = order.status;

        let restoredComponentIds: string[] = [];
        if (nextStatus === OrderStatus.CANCELLED) {
            if (!reason) throw new BadRequestException('Cần nhập lý do khi huỷ đơn');
            if (STOCK_RESERVED_STATUSES.includes(order.status)) {
                restoredComponentIds = await this.restoreStock(uow, order, performedById);
            }
            order.cancelReason = reason;
            order.cancelledAt = new Date();
        }

        if (nextStatus === OrderStatus.CONFIRMED) order.confirmedAt = new Date();
        if (nextStatus === OrderStatus.COMPLETED) {
            order.completedAt = new Date();
            if (order.paymentMethod === PaymentMethod.COD) {
                order.paymentStatus = PaymentStatus.PAID;
            }
        }
        if (nextStatus === OrderStatus.REFUNDED) order.paymentStatus = PaymentStatus.REFUNDED;

        order.status = nextStatus;
        return { order: await uow.saveOrder(order), previousStatus, restoredComponentIds };
    }

    /** Khách tự huỷ đơn của mình khi đơn còn ở trạng thái cho phép. */
    async cancelByCustomer(id: string, user: AuthenticatedUser, reason?: string): Promise<Order> {
        const order = await this.findOneForUser(id, user);

        if (!(await this.canManageOrders(user)) && order.status !== OrderStatus.PENDING) {
            throw new BadRequestException(
                'Chỉ huỷ được đơn đang chờ xác nhận — vui lòng liên hệ cửa hàng',
            );
        }
        return this.updateStatus(
            id,
            OrderStatus.CANCELLED,
            reason ?? 'Khách hàng huỷ đơn',
            user.id,
        );
    }

    /** Quyền xem/thao tác trên đơn của người khác — theo permission, không theo role code. */
    private async canManageOrders(user: AuthenticatedUser): Promise<boolean> {
        const granted = await this.userPermissionsService.getByRoleCode(user.role);
        return granted.includes(PermissionCode.ORDERS_MANAGE);
    }

    async updatePaymentStatus(id: string, paymentStatus: PaymentStatus): Promise<Order> {
        const order = await this.findOne(id);
        order.paymentStatus = paymentStatus;
        return this.ordersRepository.save(order);
    }

    async attachStripeSession(id: string, sessionId: string): Promise<Order> {
        const order = await this.findOne(id);
        order.stripeCheckoutSessionId = sessionId;
        return this.ordersRepository.save(order);
    }

    /**
     * Cổng thanh toán báo đã nhận tiền: trừ kho NGAY LÚC NÀY (đơn online không
     * giữ hàng lúc đặt) rồi đưa đơn về `pending` như đơn COD. Idempotent — webhook
     * Stripe có thể gửi lại cùng một sự kiện nhiều lần, và trang success cũng gọi
     * vào đây để không phải chờ webhook.
     *
     * Không tự gọi Stripe: trả về `needs_refund` để tầng payments hoàn tiền, vì
     * hoàn tiền là gọi mạng ra ngoài, không được nằm trong transaction đang khoá kho.
     */
    async confirmOnlinePayment(
        id: string,
        payment: { paymentIntentId: string | null },
    ): Promise<{ outcome: OnlinePaymentOutcome; order: Order }> {
        const { outcome, order, touchedComponentIds, cancelledNow } =
            await this.ordersRepository.runTransaction<{
                outcome: OnlinePaymentOutcome;
                order: Order;
                touchedComponentIds: string[];
                cancelledNow?: boolean;
            }>(async (uow) => {
                const order = await uow.lockOrder(id);
                if (!order) throw new NotFoundException(`Không tìm thấy đơn hàng với id ${id}`);

                const unchanged = { order, touchedComponentIds: [] as string[] };
                if (order.paymentStatus === PaymentStatus.REFUNDED) {
                    return { outcome: 'ignored' as const, ...unchanged };
                }
                // `paidAt = null` nghĩa là tiền chưa từng được nhận vào đơn — đơn huỷ
                // (hết hạn, admin huỷ, hết hàng) trước khi tiền về thì phải trả lại.
                // Đơn đã nhận tiền rồi mới bị huỷ thì KHÔNG tự hoàn: đó là việc admin
                // làm tay trên Stripe Dashboard.
                if (order.status === OrderStatus.CANCELLED && order.paidAt === null) {
                    order.paymentStatus = PaymentStatus.PAID;
                    order.stripePaymentIntentId = payment.paymentIntentId;
                    return {
                        outcome: 'needs_refund' as const,
                        order: await uow.saveOrder(order),
                        touchedComponentIds: [],
                    };
                }
                if (order.status !== OrderStatus.AWAITING_PAYMENT) {
                    return { outcome: 'ignored' as const, ...unchanged };
                }

                order.stripePaymentIntentId = payment.paymentIntentId;
                order.paymentStatus = PaymentStatus.PAID;

                const shortage = await this.consumeStockForPaidOrder(uow, order);
                if (shortage) {
                    order.status = OrderStatus.CANCELLED;
                    order.cancelReason = `Hết hàng khi thanh toán xong: ${shortage}`;
                    order.cancelledAt = new Date();
                    return {
                        outcome: 'needs_refund' as const,
                        order: await uow.saveOrder(order),
                        touchedComponentIds: [],
                        cancelledNow: true,
                    };
                }

                order.status = OrderStatus.PENDING;
                order.paidAt = new Date();
                return {
                    outcome: 'confirmed' as const,
                    order: await uow.saveOrder(order),
                    touchedComponentIds: this.componentVariantIds(order),
                };
            });

        await this.bundlesService.refreshBundlesContaining(touchedComponentIds);
        if (outcome === 'confirmed') {
            this.events.emit(ORDER_EVENTS.PLACED, new OrderPlacedEvent(order.id));
        } else if (cancelledNow) {
            this.events.emit(
                ORDER_EVENTS.STATUS_CHANGED,
                new OrderStatusChangedEvent(
                    order.id,
                    OrderStatus.AWAITING_PAYMENT,
                    OrderStatus.CANCELLED,
                ),
            );
        }
        return { outcome, order };
    }

    /**
     * Phiên thanh toán hết hạn / thanh toán thất bại: huỷ đơn đang chờ tiền.
     * Không hoàn kho vì đơn `awaiting_payment` chưa từng trừ kho. Đơn đã rời
     * `awaiting_payment` (đã trả tiền, đã huỷ) thì để nguyên.
     */
    async cancelUnpaid(id: string, reason: string, paymentStatus: PaymentStatus): Promise<Order> {
        return this.ordersRepository.runTransaction(async (uow) => {
            const order = await uow.lockOrder(id);
            if (!order) throw new NotFoundException(`Không tìm thấy đơn hàng với id ${id}`);
            if (order.status !== OrderStatus.AWAITING_PAYMENT) return order;

            order.status = OrderStatus.CANCELLED;
            order.paymentStatus = paymentStatus;
            order.cancelReason = reason;
            order.cancelledAt = new Date();
            return uow.saveOrder(order);
        });
    }

    async markPaymentRefunded(id: string): Promise<Order> {
        return this.ordersRepository.runTransaction(async (uow) => {
            const order = await uow.lockOrder(id);
            if (!order) throw new NotFoundException(`Không tìm thấy đơn hàng với id ${id}`);
            order.paymentStatus = PaymentStatus.REFUNDED;
            return uow.saveOrder(order);
        });
    }

    /**
     * Trừ kho cho đơn online vừa nhận tiền, dựa trên snapshot items đã ghi lúc
     * đặt — cùng quy tắc với `create`/`restoreStock`: dòng cha của combo
     * `derived_from_components` chỉ tăng `soldCount`, kho trừ ở dòng con.
     *
     * Kiểm tra đủ hàng cho CẢ đơn trước rồi mới trừ: thiếu một món thì không đụng
     * gì, trả về mô tả món thiếu để huỷ đơn và hoàn tiền. Không bỏ qua quà tặng
     * `isOptional` như lúc đặt — dòng con đã nằm trong đơn là thứ khách đã trả tiền.
     */
    private async consumeStockForPaidOrder(
        uow: OrdersUnitOfWork,
        order: Order,
    ): Promise<string | null> {
        const variantIds = order.items
            .map((item) => item.variantId)
            .filter((variantId): variantId is string => variantId !== null);
        if (variantIds.length === 0) return 'sản phẩm trong đơn không còn tồn tại';

        const parentIdsWithChildren = new Set(
            order.items.map((item) => item.parentItemId).filter((id): id is string => id !== null),
        );
        const variants = await uow.lockVariants(variantIds);

        const needed = new Map<string, number>();
        for (const item of order.items) {
            if (!item.variantId) return `"${item.productName}" không còn tồn tại`;
            if (parentIdsWithChildren.has(item.id)) continue;
            needed.set(item.variantId, (needed.get(item.variantId) ?? 0) + item.quantity);
        }
        for (const [variantId, quantity] of needed) {
            const variant = variants.get(variantId);
            if (!variant) return `biến thể ${variantId} không còn tồn tại`;
            if (variant.trackInventory && variant.stock < quantity) {
                return `"${variant.product.name} - ${variant.name}" chỉ còn ${variant.stock}, cần ${quantity}`;
            }
        }

        const touchedProductIds = new Set<string>();
        for (const item of order.items) {
            const variant = variants.get(item.variantId as string) as ProductVariant;

            if (!parentIdsWithChildren.has(item.id) && variant.trackInventory) {
                const stockBefore = variant.stock;
                this.consumeStock(variant, item.quantity);
                await uow.recordInventoryMovement({
                    variantId: variant.id,
                    type: InventoryTransactionType.OUT,
                    reasonCode: InventoryReasonCode.ORDER_SALE,
                    quantity: item.quantity,
                    stockBefore,
                    stockAfter: variant.stock,
                    referenceType: InventoryReferenceType.ORDER,
                    referenceId: order.id,
                    performedById: order.userId,
                    note: order.code,
                });
            }
            // Khớp `create`: `soldCount` chỉ tính ở dòng khách mua, không ở thành phần combo.
            if (item.parentItemId === null) variant.soldCount += item.quantity;

            await uow.saveVariant(variant);
            touchedProductIds.add(variant.productId);
        }

        await uow.refreshProductAggregates([...touchedProductIds]);
        return null;
    }

    private componentVariantIds(order: Order): string[] {
        return order.items
            .filter((item) => item.parentItemId !== null && item.variantId !== null)
            .map((item) => item.variantId as string);
    }

    /**
     * Hoàn kho đúng những dòng đã thực sự trừ kho lúc đặt: dòng con của combo,
     * và dòng cha KHÔNG có con (hàng thường hoặc combo `own_stock`). Dòng cha có
     * con chỉ hoàn `soldCount` — kho của nó chưa từng bị trừ.
     */
    private async restoreStock(
        uow: OrdersUnitOfWork,
        order: Order,
        performedById: string | null,
    ): Promise<string[]> {
        const variantIds = order.items
            .map((item) => item.variantId)
            .filter((id): id is string => id !== null);
        if (variantIds.length === 0) return [];

        const parentIdsWithChildren = new Set(
            order.items.map((item) => item.parentItemId).filter((id): id is string => id !== null),
        );

        const variants = await uow.lockVariants(variantIds);
        const touchedProductIds = new Set<string>();
        const touchedComponentIds: string[] = [];

        for (const item of order.items) {
            const variant = item.variantId ? variants.get(item.variantId) : undefined;
            if (!variant) continue; // biến thể đã bị xoá — bỏ qua, đơn vẫn giữ snapshot

            const isBundleParent = parentIdsWithChildren.has(item.id);
            if (!isBundleParent && variant.trackInventory) {
                const stockBefore = variant.stock;
                variant.stock += item.quantity;
                if (item.parentItemId !== null) touchedComponentIds.push(variant.id);

                await uow.recordInventoryMovement({
                    variantId: variant.id,
                    type: InventoryTransactionType.IN,
                    reasonCode: InventoryReasonCode.ORDER_CANCELLED,
                    quantity: item.quantity,
                    stockBefore,
                    stockAfter: variant.stock,
                    referenceType: InventoryReferenceType.ORDER,
                    referenceId: order.id,
                    performedById,
                    note: order.code,
                });
            }
            variant.soldCount = Math.max(0, variant.soldCount - item.quantity);

            await uow.saveVariant(variant);
            touchedProductIds.add(variant.productId);
        }

        await uow.refreshProductAggregates([...touchedProductIds]);
        return touchedComponentIds;
    }

    private isDerivedBundle(variant: ProductVariant): boolean {
        return variant.bundleInventoryPolicy === BundleInventoryPolicy.DERIVED_FROM_COMPONENTS;
    }

    /** Sản phẩm phải đang bán VÀ biến thể phải đang bật — tắt một cấu hình không tắt cả sản phẩm. */
    private assertSellable(variant: ProductVariant): void {
        if (variant.product.status !== ProductStatus.ACTIVE) {
            throw new BadRequestException(`Sản phẩm "${variant.product.name}" hiện không bán`);
        }
        if (!variant.isActive) {
            throw new BadRequestException(
                `Phiên bản "${variant.name}" của "${variant.product.name}" hiện không bán`,
            );
        }
    }

    private assertStockEnough(variant: ProductVariant, quantity: number): void {
        if (!variant.trackInventory) return;
        if (variant.stock < quantity) {
            throw new BadRequestException(
                `"${variant.product.name} - ${variant.name}" chỉ còn ${variant.stock} sản phẩm`,
            );
        }
    }

    private consumeStock(variant: ProductVariant, quantity: number): void {
        if (!variant.trackInventory) return;
        variant.stock -= quantity;
    }

    private assertTransitionAllowed(current: OrderStatus, next: OrderStatus): void {
        if (current === next) {
            throw new BadRequestException(`Đơn hàng đã ở trạng thái "${next}"`);
        }
        const allowed = ORDER_STATUS_TRANSITIONS[current];
        if (!allowed.includes(next)) {
            throw new BadRequestException(
                `Không thể chuyển đơn từ "${current}" sang "${next}". Trạng thái hợp lệ: ${
                    allowed.length > 0 ? allowed.join(', ') : 'không còn trạng thái nào'
                }`,
            );
        }
    }

    /** Mã đơn: DH + ngày + 6 ký tự ngẫu nhiên; thử lại nếu trùng. */
    private async generateCode(uow: OrdersUnitOfWork): Promise<string> {
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');

        for (let attempt = 0; attempt < CODE_RETRY_LIMIT; attempt += 1) {
            const random = Math.random().toString(36).slice(2, 8).toUpperCase();
            const code = `DH${datePart}-${random}`;
            if (!(await uow.codeExists(code))) return code;
        }
        throw new BadRequestException('Không sinh được mã đơn hàng, vui lòng thử lại');
    }

    /** Làm tròn 2 chữ số thập phân, khớp với numeric(14,2) trong DB. */
    private round(value: number): number {
        return Math.round(value * 100) / 100;
    }
}
