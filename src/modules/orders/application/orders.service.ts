import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import { PermissionCode } from '../../../common/enums/permission.enum';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
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
    ORDER_STATUS_TRANSITIONS,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
    STOCK_RESERVED_STATUSES,
} from '../enums/order.enum';

const CODE_RETRY_LIMIT = 5;

@Injectable()
export class OrdersService {
    constructor(
        private readonly ordersRepository: OrdersRepository,
        private readonly userPermissionsService: UserPermissionsService,
        private readonly bundlesService: ProductBundlesService,
    ) {}

    /**
     * Tạo đơn trong một transaction: khoá biến thể (FOR UPDATE), kiểm tra tồn
     * kho, trừ kho rồi mới ghi đơn. Hai request mua cùng lúc không thể bán vượt kho.
     *
     * Combo `derived_from_components` được bung thành dòng cha (mang doanh thu)
     * + dòng con cho từng thành phần (`unitPrice = 0`), và CHỈ trừ kho thành
     * phần — trừ cả hai sẽ làm hụt kho gấp đôi. Combo `own_stock` là kit đóng
     * sẵn nên trừ thẳng kho của chính nó, không đụng thành phần.
     */
    async create(dto: CreateOrderDto, userId: string | null): Promise<Order> {
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

                            this.consumeStock(componentVariant, needed);
                            await uow.saveVariant(componentVariant);
                            touchedProductIds.add(componentVariant.productId);
                            touchedComponentIds.add(componentVariant.id);
                        }
                    } else {
                        this.assertStockEnough(variant, input.quantity);
                        this.consumeStock(variant, input.quantity);
                    }

                    variant.soldCount += input.quantity;
                    await uow.saveVariant(variant);
                }

                subtotal = this.round(subtotal);
                const discount = this.round(dto.discount ?? 0);
                const shippingFee = this.round(dto.shippingFee ?? 0);

                if (discount > subtotal) {
                    throw new BadRequestException('Giảm giá không được lớn hơn tổng tiền hàng');
                }

                const saved = await uow.saveOrder(
                    uow.createOrder({
                        code: await this.generateCode(uow),
                        userId,
                        status: OrderStatus.PENDING,
                        paymentStatus: PaymentStatus.UNPAID,
                        paymentMethod: dto.paymentMethod ?? PaymentMethod.COD,
                        subtotal,
                        discount,
                        shippingFee,
                        total: this.round(subtotal - discount + shippingFee),
                        shippingAddress: dto.shippingAddress,
                        note: dto.note ?? null,
                        items: parentItems,
                    }),
                );

                for (const child of childItems) child.orderId = saved.id;
                await uow.saveOrderItems(childItems);
                await uow.refreshProductAggregates([...touchedProductIds]);

                return { order: saved, touchedComponentIds: [...touchedComponentIds] };
            },
        );

        // Kho thành phần đổi -> tồn kho cache của các combo chứa nó không còn đúng.
        // Chạy sau khi commit: bản cache chỉ phục vụ hiển thị, còn kiểm tra bán
        // vượt kho đã làm dưới khoá ở trên nên không phụ thuộc vào nó.
        await this.bundlesService.refreshBundlesContaining(touchedComponentIds);
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
    async updateStatus(id: string, nextStatus: OrderStatus, reason?: string): Promise<Order> {
        const { order, restoredComponentIds } = await this.ordersRepository.runTransaction(
            async (uow) => this.applyStatusTransition(uow, id, nextStatus, reason),
        );

        await this.bundlesService.refreshBundlesContaining(restoredComponentIds);
        return order;
    }

    private async applyStatusTransition(
        uow: OrdersUnitOfWork,
        id: string,
        nextStatus: OrderStatus,
        reason?: string,
    ): Promise<{ order: Order; restoredComponentIds: string[] }> {
        const order = await uow.findOrderWithItems(id);
        if (!order) throw new NotFoundException(`Không tìm thấy đơn hàng với id ${id}`);

        this.assertTransitionAllowed(order.status, nextStatus);

        let restoredComponentIds: string[] = [];
        if (nextStatus === OrderStatus.CANCELLED) {
            if (!reason) throw new BadRequestException('Cần nhập lý do khi huỷ đơn');
            if (STOCK_RESERVED_STATUSES.includes(order.status)) {
                restoredComponentIds = await this.restoreStock(uow, order);
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
        return { order: await uow.saveOrder(order), restoredComponentIds };
    }

    /** Khách tự huỷ đơn của mình khi đơn còn ở trạng thái cho phép. */
    async cancelByCustomer(id: string, user: AuthenticatedUser, reason?: string): Promise<Order> {
        const order = await this.findOneForUser(id, user);

        if (!(await this.canManageOrders(user)) && order.status !== OrderStatus.PENDING) {
            throw new BadRequestException(
                'Chỉ huỷ được đơn đang chờ xác nhận — vui lòng liên hệ cửa hàng',
            );
        }
        return this.updateStatus(id, OrderStatus.CANCELLED, reason ?? 'Khách hàng huỷ đơn');
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

    /** Doanh thu tính trên các đơn đã hoàn tất trong khoảng thời gian. */
    async revenueSummary(
        from: Date,
        to: Date,
    ): Promise<{ orderCount: number; revenue: number; averageValue: number }> {
        const { orderCount, revenue } = await this.ordersRepository.revenueSummary(from, to);
        return {
            orderCount,
            revenue,
            averageValue: orderCount > 0 ? this.round(revenue / orderCount) : 0,
        };
    }

    /**
     * Hoàn kho đúng những dòng đã thực sự trừ kho lúc đặt: dòng con của combo,
     * và dòng cha KHÔNG có con (hàng thường hoặc combo `own_stock`). Dòng cha có
     * con chỉ hoàn `soldCount` — kho của nó chưa từng bị trừ.
     */
    private async restoreStock(uow: OrdersUnitOfWork, order: Order): Promise<string[]> {
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
                variant.stock += item.quantity;
                if (item.parentItemId !== null) touchedComponentIds.push(variant.id);
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
