import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, type EntityManager, In, Repository } from 'typeorm';
import type { RepositoryPage } from '../../../common/interfaces/repository-page.interface';
import { resolveSortColumn } from '../../../common/utils/query.util';
import { ProductBundleItem } from '../../products/entities/product-bundle-item.entity';
import { ProductVariant } from '../../products/entities/product-variant.entity';
import { refreshProductAggregates } from '../../products/infrastructure/product-aggregates';
import { OrdersRepository, type OrdersUnitOfWork } from '../domain/orders.repository';
import type { QueryOrderDto } from '../dto/query-order.dto';
import { OrderItem } from '../entities/order-item.entity';
import { Order } from '../entities/order.entity';
import { OrderStatus } from '../enums/order.enum';

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

        if (criteria.search) {
            qb.andWhere('order.code ILIKE :search', { search: `%${criteria.search}%` });
        }
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

    findById(id: string): Promise<Order | null> {
        return this.repo.findOne({ where: { id }, relations: { items: true, user: true } });
    }

    findByCode(code: string): Promise<Order | null> {
        return this.repo.findOne({ where: { code }, relations: { items: true, user: true } });
    }

    save(order: Order): Promise<Order> {
        return this.repo.save(order);
    }

    async revenueSummary(from: Date, to: Date): Promise<{ orderCount: number; revenue: number }> {
        const row = await this.repo
            .createQueryBuilder('order')
            .select('COUNT(*)', 'orderCount')
            .addSelect('COALESCE(SUM(order.total), 0)', 'revenue')
            .where('order.status = :status', { status: OrderStatus.COMPLETED })
            .andWhere('order.createdAt BETWEEN :from AND :to', { from, to })
            .getRawOne<{ orderCount: string; revenue: string }>();

        return { orderCount: Number(row?.orderCount ?? 0), revenue: Number(row?.revenue ?? 0) };
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
            findOrderWithItems: (id) =>
                manager.findOne(Order, { where: { id }, relations: { items: true } }),
            codeExists: (code) => manager.exists(Order, { where: { code }, withDeleted: true }),
        };
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
