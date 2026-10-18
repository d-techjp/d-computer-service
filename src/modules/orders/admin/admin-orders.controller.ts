import { Body, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { LogActivity } from '../../../common/decorators/activity-log.decorator';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import { PermissionCode } from '../../../common/enums/permission.enum';
import { ActivityAction } from '../../activity-logs/enums/activity-action.enum';
import { OrderReceiptService } from '../application/order-receipt.service';
import { OrdersService } from '../application/orders.service';
import { QueryOrderDto } from '../dto/query-order.dto';
import { UpdateOrderStatusDto, UpdatePaymentStatusDto } from '../dto/update-order-status.dto';
import { Order } from '../entities/order.entity';
import { OrderReceiptDto } from './dto/order-receipt.dto';

@AdminController('orders', 'Orders')
@RequirePermissions(PermissionCode.ORDERS_MANAGE)
export class AdminOrdersController {
    constructor(
        private readonly ordersService: OrdersService,
        private readonly receiptService: OrderReceiptService,
    ) {}

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

    @Get(':id/receipt')
    @ApiOkResponse({ type: OrderReceiptDto })
    @ApiOperation({
        summary: 'Dữ liệu in bill (レシート / 適格簡易請求書)',
        description:
            'Thông tin cửa hàng (kèm số đăng ký インボイス) + đơn + tiền thuế theo thuế suất',
    })
    receipt(@Param('id', ParseUUIDPipe) id: string): Promise<OrderReceiptDto> {
        return this.receiptService.build(id);
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
        @CurrentUser('id') performedById: string,
    ): Promise<Order> {
        return this.ordersService.updateStatus(id, dto.status, dto.reason, performedById);
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
