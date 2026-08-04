import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PaginatedResult } from '../../common/dto/paginated-result.dto';
import { PermissionCode } from '../../common/enums/permission.enum';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { ProductStatus } from '../products/entities/product.entity';
import { UserPermissionsService } from '../rbac/user-permissions.service';
import { OrdersRepository, type OrdersUnitOfWork } from './domain/orders.repository';
import type { CreateOrderDto } from './dto/create-order.dto';
import type { QueryOrderDto } from './dto/query-order.dto';
import { Order } from './entities/order.entity';
import {
    ORDER_STATUS_TRANSITIONS,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
    STOCK_RESERVED_STATUSES,
} from './enums/order.enum';

const CODE_RETRY_LIMIT = 5;

@Injectable()
export class OrdersService {
    constructor(
        private readonly ordersRepository: OrdersRepository,
        private readonly userPermissionsService: UserPermissionsService,
    ) {}

    /**
     * Tạo đơn trong một transaction: khoá bản ghi sản phẩm (FOR UPDATE), kiểm tra
     * tồn kho, trừ kho rồi mới ghi đơn. Hai request mua cùng lúc không thể bán vượt kho.
     */
    async create(dto: CreateOrderDto, userId: string | null): Promise<Order> {
        return this.ordersRepository.runTransaction(async (uow) => {
            const products = await uow.lockProducts(dto.items.map((item) => item.productId));

            const items = [];
            let subtotal = 0;

            for (const input of dto.items) {
                const product = products.get(input.productId);
                if (!product) {
                    throw new NotFoundException(`Không tìm thấy sản phẩm ${input.productId}`);
                }
                if (product.status !== ProductStatus.ACTIVE) {
                    throw new BadRequestException(`Sản phẩm "${product.name}" hiện không bán`);
                }
                if (product.stock < input.quantity) {
                    throw new BadRequestException(
                        `Sản phẩm "${product.name}" chỉ còn ${product.stock} sản phẩm`,
                    );
                }

                const lineTotal = this.round(product.price * input.quantity);
                subtotal += lineTotal;

                items.push(
                    uow.createOrderItem({
                        productId: product.id,
                        productName: product.name,
                        sku: product.sku,
                        thumbnail: product.thumbnail,
                        unitPrice: product.price,
                        quantity: input.quantity,
                        total: lineTotal,
                    }),
                );

                product.stock -= input.quantity;
                product.soldCount += input.quantity;
                if (product.stock === 0) product.status = ProductStatus.OUT_OF_STOCK;
                await uow.saveProduct(product);
            }

            subtotal = this.round(subtotal);
            const discount = this.round(dto.discount ?? 0);
            const shippingFee = this.round(dto.shippingFee ?? 0);

            if (discount > subtotal) {
                throw new BadRequestException('Giảm giá không được lớn hơn tổng tiền hàng');
            }

            const order = uow.createOrder({
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
                items,
            });

            return uow.saveOrder(order);
        });
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
        return this.ordersRepository.runTransaction(async (uow) => {
            const order = await uow.findOrderWithItems(id);
            if (!order) throw new NotFoundException(`Không tìm thấy đơn hàng với id ${id}`);

            this.assertTransitionAllowed(order.status, nextStatus);

            if (nextStatus === OrderStatus.CANCELLED) {
                if (!reason) throw new BadRequestException('Cần nhập lý do khi huỷ đơn');
                if (STOCK_RESERVED_STATUSES.includes(order.status)) {
                    await this.restoreStock(uow, order);
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
            return uow.saveOrder(order);
        });
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

    private async restoreStock(uow: OrdersUnitOfWork, order: Order): Promise<void> {
        const productIds = order.items
            .map((item) => item.productId)
            .filter((id): id is string => id !== null);
        if (productIds.length === 0) return;

        const products = await uow.lockProducts(productIds);

        for (const item of order.items) {
            const product = item.productId ? products.get(item.productId) : undefined;
            if (!product) continue; // sản phẩm đã bị xoá — bỏ qua, đơn vẫn giữ snapshot

            product.stock += item.quantity;
            product.soldCount = Math.max(0, product.soldCount - item.quantity);
            if (product.status === ProductStatus.OUT_OF_STOCK && product.stock > 0) {
                product.status = ProductStatus.ACTIVE;
            }
            await uow.saveProduct(product);
        }
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
