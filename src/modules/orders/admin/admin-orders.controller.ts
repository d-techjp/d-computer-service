import { Body, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { LogActivity } from '../../../common/decorators/activity-log.decorator';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import { PermissionCode } from '../../../common/enums/permission.enum';
import { ActivityAction } from '../../activity-logs/enums/activity-action.enum';
import { OrdersService } from '../application/orders.service';
import { QueryOrderDto } from '../dto/query-order.dto';
import { UpdateOrderStatusDto, UpdatePaymentStatusDto } from '../dto/update-order-status.dto';
import { Order } from '../entities/order.entity';

@AdminController('orders', 'Orders')
@RequirePermissions(PermissionCode.ORDERS_MANAGE)
export class AdminOrdersController {
    constructor(private readonly ordersService: OrdersService) {}

    @Get()
    @ApiOperation({ summary: 'Danh sách toàn bộ đơn hàng, lọc được theo `userId`' })
    findAll(@Query() query: QueryOrderDto): Promise<PaginatedResult<Order>> {
        return this.ordersService.findAll(query);
    }

    @Get('code/:code')
    @ApiOperation({ summary: 'Tra cứu đơn theo mã' })
    findByCode(@Param('code') code: string): Promise<Order> {
        return this.ordersService.findByCode(code);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Chi tiết đơn hàng bất kỳ' })
    findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Order> {
        return this.ordersService.findOne(id);
    }

    @Patch(':id/status')
    @LogActivity({ action: ActivityAction.ORDER_STATUS_CHANGED, resource: 'order' })
    @ApiOperation({ summary: 'Đổi trạng thái đơn theo máy trạng thái' })
    updateStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateOrderStatusDto,
    ): Promise<Order> {
        return this.ordersService.updateStatus(id, dto.status, dto.reason);
    }

    @Patch(':id/payment-status')
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'order_payment' })
    @ApiOperation({ summary: 'Cập nhật trạng thái thanh toán' })
    updatePaymentStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdatePaymentStatusDto,
    ): Promise<Order> {
        return this.ordersService.updatePaymentStatus(id, dto.paymentStatus);
    }
}
