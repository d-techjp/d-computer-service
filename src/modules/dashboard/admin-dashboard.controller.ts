import { Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { AdminController } from '../../common/decorators/admin-controller.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PermissionCode } from '../../common/enums/permission.enum';
import { DashboardService } from './application/dashboard.service';
import { DashboardOverviewDto } from './dto/dashboard-overview.dto';
import { QueryDashboardDto } from './dto/query-dashboard.dto';

/** Chỉ có mặt ở trang quản trị nên không tách client/admin — xem `RbacModule`. */
@AdminController('dashboard', 'Dashboard')
@RequirePermissions(PermissionCode.DASHBOARD_VIEW)
export class AdminDashboardController {
    constructor(private readonly dashboardService: DashboardService) {}

    @Get('overview')
    @ApiOperation({
        summary: 'Số liệu tổng quan cho trang dashboard',
        description:
            'Doanh thu chỉ tính các đơn `completed`, so sánh với kỳ liền trước cùng độ dài. ' +
            'Chart theo ngày gom theo múi giờ cửa hàng và đã bù các ngày không có đơn. ' +
            '`statusBreakdown` đếm mọi đơn trong khoảng, kể cả đã huỷ. `lowStockCount` là ' +
            'số liệu tại thời điểm hiện tại, không theo khoảng thời gian.',
    })
    @ApiOkResponse({ type: DashboardOverviewDto })
    getOverview(@Query() query: QueryDashboardDto): Promise<DashboardOverviewDto> {
        return this.dashboardService.getOverview(query);
    }
}
