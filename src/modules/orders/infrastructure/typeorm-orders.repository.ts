import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, type EntityManager, Repository } from 'typeorm';
import type { RepositoryPage } from '../../../common/interfaces/repository-page.interface';
import { resolveSortColumn } from '../../../common/utils/query.util';
import { Product } from '../../products/entities/product.entity';
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
            lockProducts: (productIds) => this.lockProducts(manager, productIds),
            saveProduct: (product) => manager.save(Product, product),
            createOrderItem: (data) => manager.create(OrderItem, data),
            createOrder: (data) => manager.create(Order, data),
            saveOrder: (order) => manager.save(Order, order),
            findOrderWithItems: (id) =>
                manager.findOne(Order, { where: { id }, relations: { items: true } }),
            codeExists: (code) => manager.exists(Order, { where: { code }, withDeleted: true }),
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
}
