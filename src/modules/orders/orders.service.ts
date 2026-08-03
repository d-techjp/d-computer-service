import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, type EntityManager, Repository } from 'typeorm';
import { PaginatedResult } from '../../common/dto/paginated-result.dto';
import { Role } from '../../common/enums/role.enum';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { resolveSortColumn } from '../../common/utils/query.util';
import { Product, ProductStatus } from '../products/entities/product.entity';
import type { CreateOrderDto } from './dto/create-order.dto';
import type { QueryOrderDto } from './dto/query-order.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import {
    ORDER_STATUS_TRANSITIONS,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
    STOCK_RESERVED_STATUSES,
} from './enums/order.enum';

const SORTABLE_COLUMNS = ['createdAt', 'updatedAt', 'total', 'status', 'code'] as const;
const CODE_RETRY_LIMIT = 5;

@Injectable()
export class OrdersService {
    constructor(
        @InjectRepository(Order) private readonly ordersRepository: Repository<Order>,
        @InjectDataSource() private readonly dataSource: DataSource,
    ) {}

    /**
     * Tạo đơn trong một transaction: khoá bản ghi sản phẩm (FOR UPDATE), kiểm tra
     * tồn kho, trừ kho rồi mới ghi đơn. Hai request mua cùng lúc không thể bán vượt kho.
     */
    async create(dto: CreateOrderDto, userId: string | null): Promise<Order> {
        return this.dataSource.transaction(async (manager) => {
            const products = await this.lockProducts(
                manager,
                dto.items.map((item) => item.productId),
            );

            const items: OrderItem[] = [];
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
                    manager.create(OrderItem, {
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
                await manager.save(Product, product);
            }

            subtotal = this.round(subtotal);
            const discount = this.round(dto.discount ?? 0);
            const shippingFee = this.round(dto.shippingFee ?? 0);

            if (discount > subtotal) {
                throw new BadRequestException('Giảm giá không được lớn hơn tổng tiền hàng');
            }

            const order = manager.create(Order, {
                code: await this.generateCode(manager),
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

            return manager.save(Order, order);
        });
    }

    async findAll(query: QueryOrderDto): Promise<PaginatedResult<Order>> {
        const qb = this.ordersRepository
            .createQueryBuilder('order')
            .leftJoinAndSelect('order.items', 'item')
            .leftJoin('order.user', 'user')
            .addSelect(['user.id', 'user.email', 'user.fullName']);

        if (query.search) {
            qb.andWhere('order.code ILIKE :search', { search: `%${query.search}%` });
        }
        if (query.userId) qb.andWhere('order.userId = :userId', { userId: query.userId });
        if (query.status) qb.andWhere('order.status = :status', { status: query.status });
        if (query.paymentStatus) {
            qb.andWhere('order.paymentStatus = :paymentStatus', {
                paymentStatus: query.paymentStatus,
            });
        }
        if (query.paymentMethod) {
            qb.andWhere('order.paymentMethod = :paymentMethod', {
                paymentMethod: query.paymentMethod,
            });
        }
        if (query.from) qb.andWhere('order.createdAt >= :from', { from: query.from });
        if (query.to) qb.andWhere('order.createdAt <= :to', { to: query.to });

        const sortBy = resolveSortColumn(query.sortBy, SORTABLE_COLUMNS, 'createdAt');
        // skip/take (không phải offset/limit) để TypeORM phân trang theo đơn hàng,
        // không bị lệch khi join bảng items quan hệ 1-n
        qb.orderBy(`order.${sortBy}`, query.sortOrder).skip(query.skip).take(query.limit);

        const [items, total] = await qb.getManyAndCount();
        return new PaginatedResult(items, total, query.page, query.limit);
    }

    async findOne(id: string): Promise<Order> {
        const order = await this.ordersRepository.findOne({
            where: { id },
            relations: { items: true, user: true },
        });
        if (!order) throw new NotFoundException(`Không tìm thấy đơn hàng với id ${id}`);
        return order;
    }

    async findByCode(code: string): Promise<Order> {
        const order = await this.ordersRepository.findOne({
            where: { code },
            relations: { items: true, user: true },
        });
        if (!order) throw new NotFoundException(`Không tìm thấy đơn hàng với mã ${code}`);
        return order;
    }

    /** Khách chỉ xem được đơn của chính mình; admin/staff xem được tất cả. */
    async findOneForUser(id: string, user: AuthenticatedUser): Promise<Order> {
        const order = await this.findOne(id);
        const isStaff = user.role === Role.ADMIN || user.role === Role.STAFF;
        if (!isStaff && order.userId !== user.id) {
            throw new ForbiddenException('Bạn không có quyền xem đơn hàng này');
        }
        return order;
    }

    /**
     * Đổi trạng thái theo máy trạng thái. Khi huỷ đơn thì hoàn kho trong cùng transaction.
     */
    async updateStatus(id: string, nextStatus: OrderStatus, reason?: string): Promise<Order> {
        return this.dataSource.transaction(async (manager) => {
            const order = await manager.findOne(Order, {
                where: { id },
                relations: { items: true },
            });
            if (!order) throw new NotFoundException(`Không tìm thấy đơn hàng với id ${id}`);

            this.assertTransitionAllowed(order.status, nextStatus);

            if (nextStatus === OrderStatus.CANCELLED) {
                if (!reason) throw new BadRequestException('Cần nhập lý do khi huỷ đơn');
                if (STOCK_RESERVED_STATUSES.includes(order.status)) {
                    await this.restoreStock(manager, order);
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
            return manager.save(Order, order);
        });
    }

    /** Khách tự huỷ đơn của mình khi đơn còn ở trạng thái cho phép. */
    async cancelByCustomer(id: string, user: AuthenticatedUser, reason?: string): Promise<Order> {
        const order = await this.findOneForUser(id, user);
        const isStaff = user.role === Role.ADMIN || user.role === Role.STAFF;

        if (!isStaff && order.status !== OrderStatus.PENDING) {
            throw new BadRequestException(
                'Chỉ huỷ được đơn đang chờ xác nhận — vui lòng liên hệ cửa hàng',
            );
        }
        return this.updateStatus(id, OrderStatus.CANCELLED, reason ?? 'Khách hàng huỷ đơn');
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
        const row = await this.ordersRepository
            .createQueryBuilder('order')
            .select('COUNT(*)', 'orderCount')
            .addSelect('COALESCE(SUM(order.total), 0)', 'revenue')
            .where('order.status = :status', { status: OrderStatus.COMPLETED })
            .andWhere('order.createdAt BETWEEN :from AND :to', { from, to })
            .getRawOne<{ orderCount: string; revenue: string }>();

        const orderCount = Number(row?.orderCount ?? 0);
        const revenue = Number(row?.revenue ?? 0);
        return {
            orderCount,
            revenue,
            averageValue: orderCount > 0 ? this.round(revenue / orderCount) : 0,
        };
    }

    /** SELECT ... FOR UPDATE theo thứ tự id cố định để tránh deadlock giữa các transaction. */
    private async lockProducts(
        manager: EntityManager,
        productIds: string[],
    ): Promise<Map<string, Product>> {
        const uniqueIds = [...new Set(productIds)].sort();
        if (uniqueIds.length === 0) throw new BadRequestException('Đơn hàng không có sản phẩm nào');

        const products = await manager
            .createQueryBuilder(Product, 'product')
            .setLock('pessimistic_write')
            .where('product.id IN (:...ids)', { ids: uniqueIds })
            .orderBy('product.id', 'ASC')
            .getMany();

        return new Map(products.map((product) => [product.id, product]));
    }

    private async restoreStock(manager: EntityManager, order: Order): Promise<void> {
        const productIds = order.items
            .map((item) => item.productId)
            .filter((id): id is string => id !== null);
        if (productIds.length === 0) return;

        const products = await this.lockProducts(manager, productIds);

        for (const item of order.items) {
            const product = item.productId ? products.get(item.productId) : undefined;
            if (!product) continue; // sản phẩm đã bị xoá — bỏ qua, đơn vẫn giữ snapshot

            product.stock += item.quantity;
            product.soldCount = Math.max(0, product.soldCount - item.quantity);
            if (product.status === ProductStatus.OUT_OF_STOCK && product.stock > 0) {
                product.status = ProductStatus.ACTIVE;
            }
            await manager.save(Product, product);
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
    private async generateCode(manager: EntityManager): Promise<string> {
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');

        for (let attempt = 0; attempt < CODE_RETRY_LIMIT; attempt += 1) {
            const random = Math.random().toString(36).slice(2, 8).toUpperCase();
            const code = `DH${datePart}-${random}`;
            const exists = await manager.exists(Order, { where: { code }, withDeleted: true });
            if (!exists) return code;
        }
        throw new BadRequestException('Không sinh được mã đơn hàng, vui lòng thử lại');
    }

    /** Làm tròn 2 chữ số thập phân, khớp với numeric(14,2) trong DB. */
    private round(value: number): number {
        return Math.round(value * 100) / 100;
    }
}
