import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../../orders/enums/order.enum';

/** Một chỉ số có so sánh với kỳ liền trước cùng độ dài. */
export class DashboardMetricDto {
    @ApiProperty({ example: 12500000, description: 'Giá trị trong khoảng đang xem' })
    value: number;

    @ApiProperty({ example: 10000000, description: 'Giá trị của kỳ liền trước cùng độ dài' })
    previousValue: number;

    @ApiProperty({
        example: 25,
        description: '% thay đổi so với kỳ trước; kỳ trước = 0 thì trả 100 (hoặc 0 nếu cả hai = 0)',
    })
    trend: number;
}

export class DashboardSummaryDto {
    @ApiProperty({ type: DashboardMetricDto, description: 'Doanh thu từ các đơn đã hoàn tất' })
    revenue: DashboardMetricDto;

    @ApiProperty({ type: DashboardMetricDto, description: 'Số đơn đã hoàn tất' })
    orderCount: DashboardMetricDto;

    @ApiProperty({ type: DashboardMetricDto, description: 'Số khách hàng đăng ký mới' })
    newCustomerCount: DashboardMetricDto;

    @ApiProperty({ example: 1500000, description: 'Giá trị trung bình mỗi đơn đã hoàn tất' })
    averageOrderValue: number;

    @ApiProperty({
        example: 7,
        description:
            'Số biến thể đang theo dõi kho có tồn <= ngưỡng cảnh báo (không theo khoảng thời gian)',
    })
    lowStockCount: number;
}

export class DashboardRevenuePointDto {
    @ApiProperty({ example: '2026-10-08', description: 'Ngày theo múi giờ cửa hàng' })
    date: string;

    @ApiProperty({ example: 2400000 })
    revenue: number;

    @ApiProperty({ example: 3 })
    orderCount: number;
}

export class DashboardStatusSliceDto {
    @ApiProperty({ enum: OrderStatus })
    status: OrderStatus;

    @ApiProperty({ example: 12 })
    count: number;
}

export class DashboardTopProductDto {
    @ApiPropertyOptional({
        format: 'uuid',
        description: 'null khi sản phẩm gốc đã bị xoá — tên vẫn còn do order_items lưu snapshot',
    })
    productId: string | null;

    @ApiProperty({ example: 'Laptop Dell Vostro 3520' })
    productName: string;

    @ApiProperty({ example: 31980000 })
    revenue: number;

    @ApiProperty({ example: 2, description: 'Số lượng đã bán trong khoảng' })
    quantity: number;
}

export class DashboardOverviewDto {
    @ApiProperty({ example: '2026-09-11T00:00:00.000Z', description: 'Mốc đầu đã áp dụng' })
    from: string;

    @ApiProperty({ example: '2026-10-10T23:59:59.999Z', description: 'Mốc cuối đã áp dụng' })
    to: string;

    @ApiProperty({ example: 'Asia/Tokyo', description: 'Múi giờ dùng để gom số liệu theo ngày' })
    timeZone: string;

    @ApiProperty({ type: DashboardSummaryDto })
    summary: DashboardSummaryDto;

    @ApiProperty({
        type: DashboardRevenuePointDto,
        isArray: true,
        description: 'Liên tục theo ngày — ngày không có đơn vẫn có mặt với giá trị 0',
    })
    revenueByDay: DashboardRevenuePointDto[];

    @ApiProperty({
        type: DashboardStatusSliceDto,
        isArray: true,
        description: 'Đếm TẤT CẢ đơn trong khoảng theo trạng thái, kể cả đơn đã huỷ',
    })
    statusBreakdown: DashboardStatusSliceDto[];

    @ApiProperty({ type: DashboardTopProductDto, isArray: true })
    topProducts: DashboardTopProductDto[];
}
