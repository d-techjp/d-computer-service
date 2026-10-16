import { BadRequestException, Injectable } from '@nestjs/common';
import {
    DASHBOARD_TIME_ZONE,
    DEFAULT_RANGE_DAYS,
    MAX_RANGE_DAYS,
    TOP_PRODUCTS_LIMIT,
} from '../dashboard.constants';
import { DashboardRepository, type DateRange } from '../domain/dashboard.repository';
import {
    DashboardMetricDto,
    DashboardOverviewDto,
    DashboardRevenuePointDto,
} from '../dto/dashboard-overview.dto';
import type { QueryDashboardDto } from '../dto/query-dashboard.dto';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD` theo múi giờ cửa hàng — en-CA cho đúng định dạng ISO sẵn. */
const dayFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: DASHBOARD_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

@Injectable()
export class DashboardService {
    constructor(private readonly dashboardRepository: DashboardRepository) {}

    async getOverview(query: QueryDashboardDto): Promise<DashboardOverviewDto> {
        const range = this.resolveRange(query);
        const previous = this.previousRange(range);

        // Tám truy vấn độc lập, không cái nào phụ thuộc kết quả cái nào.
        const [
            revenueTotals,
            previousRevenueTotals,
            dailyRevenue,
            statusBreakdown,
            topProducts,
            newCustomerCount,
            previousNewCustomerCount,
            lowStockCount,
        ] = await Promise.all([
            this.dashboardRepository.revenueTotals(range),
            this.dashboardRepository.revenueTotals(previous),
            this.dashboardRepository.dailyRevenue(range),
            this.dashboardRepository.statusBreakdown(range),
            this.dashboardRepository.topProducts(range, TOP_PRODUCTS_LIMIT),
            this.dashboardRepository.newCustomerCount(range),
            this.dashboardRepository.newCustomerCount(previous),
            this.dashboardRepository.lowStockCount(),
        ]);

        return {
            from: range.from.toISOString(),
            to: range.to.toISOString(),
            timeZone: DASHBOARD_TIME_ZONE,
            summary: {
                revenue: this.buildMetric(revenueTotals.revenue, previousRevenueTotals.revenue),
                orderCount: this.buildMetric(
                    revenueTotals.orderCount,
                    previousRevenueTotals.orderCount,
                ),
                newCustomerCount: this.buildMetric(newCustomerCount, previousNewCustomerCount),
                averageOrderValue:
                    revenueTotals.orderCount > 0
                        ? this.roundMoney(revenueTotals.revenue / revenueTotals.orderCount)
                        : 0,
                lowStockCount,
            },
            revenueByDay: this.fillMissingDays(range, dailyRevenue),
            statusBreakdown,
            topProducts,
        };
    }

    /**
     * Bỏ trống `from`/`to` thì lấy `DEFAULT_RANGE_DAYS` ngày gần nhất. Hai mốc
     * được dùng nguyên trạng (client gửi đầu/cuối ngày theo giờ của mình), chỉ
     * chặn khoảng ngược và khoảng quá dài.
     */
    private resolveRange(query: QueryDashboardDto): DateRange {
        const to = query.to ? new Date(query.to) : new Date();
        const from = query.from
            ? new Date(query.from)
            : new Date(to.getTime() - (DEFAULT_RANGE_DAYS - 1) * DAY_IN_MS);

        if (from.getTime() > to.getTime()) {
            throw new BadRequestException('`from` phải nhỏ hơn hoặc bằng `to`');
        }
        if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * DAY_IN_MS) {
            throw new BadRequestException(`Khoảng thống kê tối đa ${MAX_RANGE_DAYS} ngày`);
        }

        return { from, to };
    }

    /** Kỳ liền trước, cùng độ dài, kết thúc ngay trước `from`. */
    private previousRange({ from, to }: DateRange): DateRange {
        const length = to.getTime() - from.getTime();
        const previousTo = new Date(from.getTime() - 1);
        return { from: new Date(previousTo.getTime() - length), to: previousTo };
    }

    private buildMetric(value: number, previousValue: number): DashboardMetricDto {
        return {
            value: this.roundMoney(value),
            previousValue: this.roundMoney(previousValue),
            trend: this.percentChange(value, previousValue),
        };
    }

    /** Kỳ trước bằng 0 thì không có tỉ lệ nào có nghĩa — quy ước 100% nếu kỳ này có số. */
    private percentChange(current: number, previous: number): number {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 1000) / 10;
    }

    private roundMoney(value: number): number {
        return Math.round(value * 100) / 100;
    }

    /**
     * DB chỉ trả ngày có đơn. Chart cần trục liên tục, nếu không các ngày không
     * bán được gì sẽ bị bỏ qua và đường biểu diễn nhảy cóc.
     */
    private fillMissingDays(
        range: DateRange,
        rows: { date: string; revenue: number; orderCount: number }[],
    ): DashboardRevenuePointDto[] {
        const byDate = new Map(rows.map((row) => [row.date, row]));

        // Neo vào UTC-midnight của chuỗi ngày đã quy đổi sẵn sang múi giờ cửa
        // hàng: cộng dồn 24h ở đây chỉ sinh nhãn ngày, nên DST không làm lệch.
        const start = new Date(`${dayFormatter.format(range.from)}T00:00:00Z`);
        const end = new Date(`${dayFormatter.format(range.to)}T00:00:00Z`);
        const days = Math.round((end.getTime() - start.getTime()) / DAY_IN_MS) + 1;

        return Array.from({ length: days }, (_, index) => {
            const date = new Date(start.getTime() + index * DAY_IN_MS).toISOString().slice(0, 10);
            const row = byDate.get(date);
            return {
                date,
                revenue: row ? this.roundMoney(row.revenue) : 0,
                orderCount: row?.orderCount ?? 0,
            };
        });
    }
}
