import type { RepositoryPage } from '../../../common/interfaces/repository-page.interface';
import type { ProductBundleItem } from '../../products/entities/product-bundle-item.entity';
import type { ProductVariant } from '../../products/entities/product-variant.entity';
import type { QueryOrderDto } from '../dto/query-order.dto';
import type { OrderItem } from '../entities/order-item.entity';
import type { Order } from '../entities/order.entity';

/**
 * Đặt/huỷ đơn phải sửa Order + OrderItem + ProductVariant (+ số liệu tổng hợp
 * trên Product) trong CÙNG một transaction — vượt ra ngoài một aggregate/
 * repository đơn lẻ. `OrdersUnitOfWork` là cửa duy nhất OrdersService được phép
 * đọc/ghi trong transaction đó; mọi quy tắc nghiệp vụ (tính tiền, validate tồn
 * kho, bung combo, máy trạng thái, sinh mã đơn) vẫn nằm ở service — đây chỉ là
 * các thao tác đọc/ghi thuần, không quyết định business logic.
 */
export interface OrdersUnitOfWork {
    /**
     * SELECT ... FOR UPDATE theo thứ tự id cố định — khoá biến thể, tránh
     * deadlock. Nạp kèm `product` để service kiểm tra trạng thái bán.
     */
    lockVariants(variantIds: string[]): Promise<Map<string, ProductVariant>>;

    /** Thành phần của các combo, đọc trong transaction; kèm `componentVariant`. */
    findBundleItems(bundleVariantIds: string[]): Promise<ProductBundleItem[]>;

    saveVariant(variant: ProductVariant): Promise<ProductVariant>;

    /** Tính lại min/max giá, tồn kho, đã bán, trạng thái của các product liên quan. */
    refreshProductAggregates(productIds: string[]): Promise<void>;

    createOrderItem(data: Partial<OrderItem>): OrderItem;

    /**
     * Ghi các dòng component của combo. Phải là một lần lưu RIÊNG, sau khi dòng
     * cha đã có trong DB — `parent_item_id` là FK trỏ về chính bảng này, cascade
     * của TypeORM không đảm bảo cha được chèn trước con.
     */
    saveOrderItems(items: OrderItem[]): Promise<OrderItem[]>;

    createOrder(data: Partial<Order>): Order;

    saveOrder(order: Order): Promise<Order>;

    findOrderWithItems(id: string): Promise<Order | null>;

    /** Kiểm tra trùng mã đơn, tính cả bản ghi đã soft-delete. */
    codeExists(code: string): Promise<boolean>;
}

export abstract class OrdersRepository {
    abstract search(criteria: QueryOrderDto): Promise<RepositoryPage<Order>>;

    abstract findById(id: string): Promise<Order | null>;

    abstract findByCode(code: string): Promise<Order | null>;

    abstract save(order: Order): Promise<Order>;

    abstract revenueSummary(from: Date, to: Date): Promise<{ orderCount: number; revenue: number }>;

    abstract runTransaction<T>(work: (unitOfWork: OrdersUnitOfWork) => Promise<T>): Promise<T>;
}
