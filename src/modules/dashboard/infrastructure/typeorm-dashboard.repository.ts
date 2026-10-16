import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleCode } from '../../../common/enums/role.enum';
import { OrderItem } from '../../orders/entities/order-item.entity';
import { Order } from '../../orders/entities/order.entity';
import { OrderStatus } from '../../orders/enums/order.enum';
import {
    BundleInventoryPolicy,
    ProductVariant,
} from '../../products/entities/product-variant.entity';
import { User } from '../../users/entities/user.entity';
import { DASHBOARD_TIME_ZONE } from '../dashboard.constants';
import {
    DashboardRepository,
    type DailyRevenueRow,
    type DateRange,
    type OrderStatusCount,
    type RevenueTotals,
    type TopProductRow,
} from '../domain/dashboard.repository';

/**
 * Ngày theo múi giờ cửa hàng. Viết `order.createdAt` (property name) để TypeORM
 * tự đổi thành `"order"."created_at"` — `order` là từ khoá SQL nên không thể tự
 * viết tay tiền tố alias.
 */
const ORDER_DAY = `(order.createdAt AT TIME ZONE '${DASHBOARD_TIME_ZONE}')::date`;

/**
 * Gom theo product; đơn của sản phẩm đã bị xoá (`product_id` = null do
 * `ON DELETE SET NULL`) rơi về `sku` thay vì dồn hết vào một nhóm null.
 *
 * Dùng `CAST(... AS text)` chứ KHÔNG phải `item.productId::text`: TypeORM chỉ
 * đổi `alias.propertyName` sang tên cột thật khi ký tự liền sau là khoảng trắng,
 * `=`, `)` hoặc `,` — dấu `::` làm nó bỏ qua và Postgres báo không có cột
 * "item.productId".
 */
const TOP_PRODUCT_GROUP_KEY = 'COALESCE(CAST(item.productId AS text), item.sku)';

@Injectable()
export class TypeOrmDashboardRepository extends DashboardRepository {
    constructor(
        @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
        @InjectRepository(OrderItem) private readonly orderItemRepo: Repository<OrderItem>,
        @InjectRepository(User) private readonly userRepo: Repository<User>,
        @InjectRepository(ProductVariant) private readonly variantRepo: Repository<ProductVariant>,
    ) {
        super();
    }

    async revenueTotals({ from, to }: DateRange): Promise<RevenueTotals> {
        const row = await this.orderRepo
            .createQueryBuilder('order')
            .select('COUNT(*)', 'orderCount')
            .addSelect('COALESCE(SUM(order.total), 0)', 'revenue')
            .where('order.status = :status', { status: OrderStatus.COMPLETED })
            .andWhere('order.createdAt BETWEEN :from AND :to', { from, to })
            .getRawOne<{ orderCount: string; revenue: string }>();

        // `numeric` về dạng string trong raw result — ColumnNumericTransformer không áp cho getRaw*
        return { orderCount: Number(row?.orderCount ?? 0), revenue: Number(row?.revenue ?? 0) };
    }

    async dailyRevenue({ from, to }: DateRange): Promise<DailyRevenueRow[]> {
        const rows = await this.orderRepo
            .createQueryBuilder('order')
            // Trả về text thay vì `date`: driver pg parse kiểu `date` thành Date ở
            // múi giờ máy chủ, đúng cái lệch ngày vừa ép múi giờ để tránh.
            .select(`TO_CHAR(${ORDER_DAY}, 'YYYY-MM-DD')`, 'date')
            .addSelect('COUNT(*)', 'orderCount')
            .addSelect('COALESCE(SUM(order.total), 0)', 'revenue')
            .where('order.status = :status', { status: OrderStatus.COMPLETED })
            .andWhere('order.createdAt BETWEEN :from AND :to', { from, to })
            .groupBy(ORDER_DAY)
            .orderBy(ORDER_DAY, 'ASC')
            .getRawMany<{ date: string; orderCount: string; revenue: string }>();

        return rows.map((row) => ({
            date: row.date,
            revenue: Number(row.revenue),
            orderCount: Number(row.orderCount),
        }));
    }

    async statusBreakdown({ from, to }: DateRange): Promise<OrderStatusCount[]> {
        const rows = await this.orderRepo
            .createQueryBuilder('order')
            .select('order.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .where('order.createdAt BETWEEN :from AND :to', { from, to })
            .groupBy('order.status')
            .getRawMany<{ status: OrderStatus; count: string }>();

        return rows.map((row) => ({ status: row.status, count: Number(row.count) }));
    }

    async topProducts({ from, to }: DateRange, limit: number): Promise<TopProductRow[]> {
        const rows = await this.orderItemRepo
            .createQueryBuilder('item')
            .innerJoin('item.order', 'order')
            .select(TOP_PRODUCT_GROUP_KEY, 'groupKey')
            .addSelect('MAX(CAST(item.productId AS text))', 'productId')
            .addSelect('MAX(item.productName)', 'productName')
            .addSelect('COALESCE(SUM(item.total), 0)', 'revenue')
            .addSelect('COALESCE(SUM(item.quantity), 0)', 'quantity')
            .where('order.status = :status', { status: OrderStatus.COMPLETED })
            .andWhere('order.createdAt BETWEEN :from AND :to', { from, to })
            // Alias join không được TypeORM lọc soft-delete, phải tự loại đơn đã xoá.
            .andWhere('order.deletedAt IS NULL')
            // Combo `derived_from_components` bung thành dòng cha (giữ toàn bộ doanh
            // thu) + N dòng con `unitPrice = 0`. Bỏ dòng con, nếu không các component
            // sẽ chiếm chỗ trong top với doanh thu 0.
            .andWhere('item.parentItemId IS NULL')
            .groupBy(TOP_PRODUCT_GROUP_KEY)
            .orderBy('revenue', 'DESC')
            .limit(limit)
            .getRawMany<{
                productId: string | null;
                productName: string;
                revenue: string;
                quantity: string;
            }>();

        return rows.map((row) => ({
            productId: row.productId,
            productName: row.productName,
            revenue: Number(row.revenue),
            quantity: Number(row.quantity),
        }));
    }

    newCustomerCount({ from, to }: DateRange): Promise<number> {
        return this.userRepo
            .createQueryBuilder('user')
            .innerJoin('user.role', 'role')
            .where('role.code = :code', { code: RoleCode.CUSTOMER })
            .andWhere('user.createdAt BETWEEN :from AND :to', { from, to })
            .getCount();
    }

    lowStockCount(): Promise<number> {
        return (
            this.variantRepo
                .createQueryBuilder('variant')
                .where('variant.isActive = true')
                .andWhere('variant.trackInventory = true')
                // Combo lấy tồn từ component nên `stock` của nó vô nghĩa — xem
                // BundleInventoryPolicy.DERIVED_FROM_COMPONENTS.
                .andWhere(
                    '(variant.bundleInventoryPolicy IS NULL OR variant.bundleInventoryPolicy != :derived)',
                    {
                        derived: BundleInventoryPolicy.DERIVED_FROM_COMPONENTS,
                    },
                )
                .andWhere('variant.stock <= variant.lowStockThreshold')
                .getCount()
        );
    }
}
