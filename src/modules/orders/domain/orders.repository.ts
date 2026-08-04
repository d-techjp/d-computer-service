import type { RepositoryPage } from '../../../common/interfaces/repository-page.interface';
import type { Product } from '../../products/entities/product.entity';
import type { QueryOrderDto } from '../dto/query-order.dto';
import type { OrderItem } from '../entities/order-item.entity';
import type { Order } from '../entities/order.entity';

/**
 * Đặt/huỷ đơn phải sửa Order + OrderItem + Product trong CÙNG một transaction
 * (trừ kho khi đặt, hoàn kho khi huỷ) — vượt ra ngoài một aggregate/repository
 * đơn lẻ. `OrdersUnitOfWork` là cửa duy nhất OrdersService được phép đọc/ghi
 * trong transaction đó; mọi quy tắc nghiệp vụ (tính tiền, validate tồn kho,
 * máy trạng thái, sinh mã đơn) vẫn nằm ở service — đây chỉ là các thao tác
 * đọc/ghi thuần, không quyết định business logic.
 */
export interface OrdersUnitOfWork {
    /** SELECT ... FOR UPDATE theo thứ tự id cố định — khoá sản phẩm, tránh deadlock. */
    lockProducts(productIds: string[]): Promise<Map<string, Product>>;

    saveProduct(product: Product): Promise<Product>;

    createOrderItem(data: Partial<OrderItem>): OrderItem;

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
