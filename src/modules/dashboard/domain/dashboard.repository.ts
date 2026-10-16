import type { OrderStatus } from '../../orders/enums/order.enum';

/** Khoảng thời gian đã quy đổi về Date, tính cả hai đầu. */
export interface DateRange {
    from: Date;
    to: Date;
}

export interface RevenueTotals {
    orderCount: number;
    revenue: number;
}

export interface DailyRevenueRow {
    /** `YYYY-MM-DD` theo múi giờ cửa hàng, không phải UTC. */
    date: string;
    revenue: number;
    orderCount: number;
}

export interface OrderStatusCount {
    status: OrderStatus;
    count: number;
}

export interface TopProductRow {
    productId: string | null;
    productName: string;
    revenue: number;
    quantity: number;
}

/**
 * Chỉ đọc. Dashboard KHÔNG sở hữu bảng nào — nó tổng hợp chéo `orders`,
 * `order_items`, `users`, `product_variants`. Mọi số liệu được tính trực tiếp
 * bằng GROUP BY trên dữ liệu gốc, không có bảng rollup: doanh thu thay đổi về
 * quá khứ mỗi khi đơn đổi trạng thái (hoàn tất, huỷ, hoàn tiền), nên một bảng
 * tổng hợp sẽ lệch âm thầm. Nếu sau này cần nhanh hơn, hướng nâng cấp là cache
 * Redis cho các khoảng ngày đã đóng, rồi mới tới materialized view.
 */
export abstract class DashboardRepository {
    /** Doanh thu và số đơn của các đơn ĐÃ HOÀN TẤT trong khoảng. */
    abstract revenueTotals(range: DateRange): Promise<RevenueTotals>;

    /** Doanh thu theo từng ngày — chỉ trả về ngày CÓ đơn, service tự bù ngày trống. */
    abstract dailyRevenue(range: DateRange): Promise<DailyRevenueRow[]>;

    /** Đếm đơn theo trạng thái — mọi trạng thái, không lọc riêng đơn hoàn tất. */
    abstract statusBreakdown(range: DateRange): Promise<OrderStatusCount[]>;

    /** Top sản phẩm theo doanh thu trong khoảng, lấy từ đơn đã hoàn tất. */
    abstract topProducts(range: DateRange, limit: number): Promise<TopProductRow[]>;

    /** Số tài khoản khách hàng được tạo trong khoảng. */
    abstract newCustomerCount(range: DateRange): Promise<number>;

    /** Số biến thể sắp hết hàng tại thời điểm hiện tại — không phụ thuộc khoảng thời gian. */
    abstract lowStockCount(): Promise<number>;
}
