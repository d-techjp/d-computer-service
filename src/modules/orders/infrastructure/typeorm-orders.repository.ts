import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
    Brackets,
    DataSource,
    type EntityManager,
    In,
    Repository,
    type SelectQueryBuilder,
} from 'typeorm';
import type { RepositoryPage } from '../../../common/interfaces/repository-page.interface';
import { resolveSortColumn } from '../../../common/utils/query.util';
import { recordInventoryMovement } from '../../inventory/infrastructure/record-inventory-movement';
import { ProductBundleItem } from '../../products/entities/product-bundle-item.entity';
import { ProductVariant } from '../../products/entities/product-variant.entity';
import { refreshProductAggregates } from '../../products/infrastructure/product-aggregates';
import {
    type CustomerOrderStats,
    OrdersRepository,
    type OrdersUnitOfWork,
} from '../domain/orders.repository';
import { OrderStatus } from '../enums/order.enum';
import type { QueryOrderDto } from '../dto/query-order.dto';
import { OrderItem } from '../entities/order-item.entity';
import { Order } from '../entities/order.entity';

const SORTABLE_COLUMNS = ['createdAt', 'updatedAt', 'total', 'status', 'code'] as const;

@Injectable()
export class TypeOrmOrdersRepository extends OrdersRepository {
    constructor(
        @InjectRepository(Order) private readonly repo: Repository<Order>,
        @InjectDataSource() private readonly dataSource: DataSource,
    ) {
        super();
    }

    async search(criteria: QueryOrderDto): Promise<RepositoryPage<Order>> {
        const qb = this.repo
            .createQueryBuilder('order')
            .leftJoinAndSelect('order.items', 'item')
            .leftJoin('order.user', 'user')
            .addSelect(['user.id', 'user.email', 'user.fullName']);

        if (criteria.search) this.applySearch(qb, criteria.search);
        if (criteria.userId) qb.andWhere('order.userId = :userId', { userId: criteria.userId });
        if (criteria.status) qb.andWhere('order.status = :status', { status: criteria.status });
        if (criteria.paymentStatus) {
            qb.andWhere('order.paymentStatus = :paymentStatus', {
                paymentStatus: criteria.paymentStatus,
            });
        }
        if (criteria.paymentMethod) {
            qb.andWhere('order.paymentMethod = :paymentMethod', {
                paymentMethod: criteria.paymentMethod,
            });
        }
        if (criteria.from) qb.andWhere('order.createdAt >= :from', { from: criteria.from });
        if (criteria.to) qb.andWhere('order.createdAt <= :to', { to: criteria.to });

        const sortBy = resolveSortColumn(criteria.sortBy, SORTABLE_COLUMNS, 'createdAt');
        // skip/take (không phải offset/limit) để TypeORM phân trang theo đơn hàng,
        // không bị lệch khi join bảng items quan hệ 1-n
        qb.orderBy(`order.${sortBy}`, criteria.sortOrder).skip(criteria.skip).take(criteria.limit);

        const [items, total] = await qb.getManyAndCount();
        return { items, total };
    }

    /**
     * Một ô tìm cho cả mã đơn, tên khách (theo đơn và theo tài khoản), email và
     * số điện thoại. Số điện thoại so theo chữ số, bỏ số 0 đầu / mã nước, để
     * `0373847371` tìm ra cả đơn ghi `+84373847371` lẫn `037-3847-371`.
     */
    private applySearch(qb: SelectQueryBuilder<Order>, raw: string): void {
        const search = `%${raw.trim()}%`;
        const phoneCandidates = phoneSearchCandidates(raw);

        qb.andWhere(
            new Brackets((where) => {
                where
                    .where('order.code ILIKE :search', { search })
                    .orWhere(`order.shippingAddress ->> 'fullName' ILIKE :search`, { search })
                    .orWhere('order.customerEmail ILIKE :search', { search })
                    .orWhere('user.fullName ILIKE :search', { search });
                phoneCandidates.forEach((digits, index) => {
                    where.orWhere(
                        `regexp_replace(order.shippingAddress ->> 'phone', '[^0-9]', '', 'g') LIKE :phone${index}`,
                        { [`phone${index}`]: `%${digits}%` },
                    );
                });
            }),
        );
    }

    async customerStats(userId: string): Promise<CustomerOrderStats> {
        // Một lượt quét với FILTER thay vì nhiều query. `awaiting_payment` là đơn
        // online chưa trả tiền (có thể không bao giờ trả) — không tính là đã đặt.
        const row = await this.repo
            .createQueryBuilder('order')
            .select(`COUNT(*) FILTER (WHERE order.status <> :awaiting)`, 'orderCount')
            .addSelect(`COUNT(*) FILTER (WHERE order.status = :completed)`, 'completedCount')
            .addSelect(`COUNT(*) FILTER (WHERE order.status = :cancelled)`, 'cancelledCount')
            .addSelect(
                `COALESCE(SUM(order.total) FILTER (WHERE order.status = :completed), 0)`,
                'totalSpent',
            )
            .addSelect(
                `MIN(order.createdAt) FILTER (WHERE order.status <> :awaiting)`,
                'firstOrderAt',
            )
            .addSelect(
                `MAX(order.createdAt) FILTER (WHERE order.status <> :awaiting)`,
                'lastOrderAt',
            )
            .where('order.userId = :userId', { userId })
            .setParameters({
                awaiting: OrderStatus.AWAITING_PAYMENT,
                completed: OrderStatus.COMPLETED,
                cancelled: OrderStatus.CANCELLED,
            })
            .getRawOne<Record<string, string | Date | null>>();

        // COUNT trả bigint, SUM(numeric) trả numeric — pg đưa về chuỗi
        return {
            orderCount: Number(row?.orderCount ?? 0),
            completedCount: Number(row?.completedCount ?? 0),
            cancelledCount: Number(row?.cancelledCount ?? 0),
            totalSpent: Number(row?.totalSpent ?? 0),
            firstOrderAt: row?.firstOrderAt ? new Date(row.firstOrderAt) : null,
            lastOrderAt: row?.lastOrderAt ? new Date(row.lastOrderAt) : null,
        };
    }

    findById(id: string): Promise<Order | null> {
        return this.repo.findOne({ where: { id }, relations: { items: true, user: true } });
    }

    findByCode(code: string): Promise<Order | null> {
        return this.repo.findOne({ where: { code }, relations: { items: true, user: true } });
    }

    save(order: Order): Promise<Order> {
        return this.repo.save(order);
    }

    runTransaction<T>(work: (unitOfWork: OrdersUnitOfWork) => Promise<T>): Promise<T> {
        return this.dataSource.transaction((manager) => work(this.buildUnitOfWork(manager)));
    }

    private buildUnitOfWork(manager: EntityManager): OrdersUnitOfWork {
        return {
            lockVariants: (variantIds) => this.lockVariants(manager, variantIds),
            findBundleItems: (bundleVariantIds) =>
                bundleVariantIds.length === 0
                    ? Promise.resolve([])
                    : manager.find(ProductBundleItem, {
                          where: { bundleVariantId: In(bundleVariantIds) },
                          relations: { componentVariant: true },
                          order: { position: 'ASC' },
                      }),
            saveVariant: (variant) => manager.save(ProductVariant, variant),
            refreshProductAggregates: async (productIds) => {
                for (const productId of new Set(productIds)) {
                    await refreshProductAggregates(manager, productId);
                }
            },
            createOrderItem: (data) => manager.create(OrderItem, data),
            saveOrderItems: (items) =>
                items.length === 0 ? Promise.resolve([]) : manager.save(OrderItem, items),
            createOrder: (data) => manager.create(Order, data),
            saveOrder: (order) => manager.save(Order, order),
            lockOrder: (id) => this.lockOrder(manager, id),
            codeExists: (code) => manager.exists(Order, { where: { code }, withDeleted: true }),
            recordInventoryMovement: (data) =>
                recordInventoryMovement(manager, data).then(() => undefined),
        };
    }

    /**
     * Khoá và đọc items ở HAI câu riêng: Postgres không cho `FOR UPDATE` trên phía
     * nullable của LEFT JOIN, mà `relations` của TypeORM luôn sinh LEFT JOIN.
     */
    private async lockOrder(manager: EntityManager, id: string): Promise<Order | null> {
        const order = await manager
            .createQueryBuilder(Order, 'order')
            .setLock('pessimistic_write')
            .where('order.id = :id', { id })
            .getOne();
        if (!order) return null;

        order.items = await manager.find(OrderItem, { where: { orderId: order.id } });
        return order;
    }

    /**
     * SELECT ... FOR UPDATE theo thứ tự id cố định để tránh deadlock giữa các
     * transaction. Dùng `setLock('pessimistic_write', undefined, ['variant'])`
     * để chỉ khoá hàng của `product_variants` — join `product` chỉ để đọc, khoá
     * luôn cả bảng product sẽ chặn oan mọi đơn khác của cùng sản phẩm.
     */
    private async lockVariants(
        manager: EntityManager,
        variantIds: string[],
    ): Promise<Map<string, ProductVariant>> {
        const uniqueIds = [...new Set(variantIds)].sort();
        if (uniqueIds.length === 0) throw new BadRequestException('Đơn hàng không có sản phẩm nào');

        const variants = await manager
            .createQueryBuilder(ProductVariant, 'variant')
            .setLock('pessimistic_write', undefined, ['variant'])
            .innerJoinAndSelect('variant.product', 'product')
            .where('variant.id IN (:...ids)', { ids: uniqueIds })
            .orderBy('variant.id', 'ASC')
            .getMany();

        return new Map(variants.map((variant) => [variant.id, variant]));
    }
}

/**
 * Dãy số dùng để so số điện thoại: bỏ số 0 đầu (`0373…` -> `373…`), và nếu
 * người dùng gõ kèm mã nước Việt Nam / Nhật (`84…`, `81…`) thì thử thêm bản bỏ
 * mã nước. Dưới 3 chữ số thì không tìm theo số — dễ khớp nhầm mã đơn, số tiền.
 */
function phoneSearchCandidates(raw: string): string[] {
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 3) return [];
    const candidates = new Set([digits.replace(/^0+/, '') || digits]);
    if (/^(84|81)/.test(digits) && digits.length >= 11) candidates.add(digits.slice(2));
    return [...candidates];
}
