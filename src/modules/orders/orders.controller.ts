import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LogActivity } from '../../common/decorators/activity-log.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PaginatedResult } from '../../common/dto/paginated-result.dto';
import { PermissionCode } from '../../common/enums/permission.enum';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { ActivityAction } from '../activity-logs/enums/activity-action.enum';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import {
    CancelOrderDto,
    UpdateOrderStatusDto,
    UpdatePaymentStatusDto,
} from './dto/update-order-status.dto';
import { Order } from './entities/order.entity';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) {}

    @Post()
    @LogActivity({ action: ActivityAction.ORDER_PLACED, resource: 'order' })
    @ApiOperation({
        summary: 'Đặt hàng',
        description: 'Kiểm tra và trừ tồn kho trong một transaction có khoá bản ghi sản phẩm.',
    })
    create(@Body() dto: CreateOrderDto, @CurrentUser('id') userId: string): Promise<Order> {
        return this.ordersService.create(dto, userId);
    }

    @Get()
    @RequirePermissions(PermissionCode.ORDERS_MANAGE)
    @ApiOperation({ summary: 'Danh sách toàn bộ đơn hàng (quản trị)' })
    findAll(@Query() query: QueryOrderDto): Promise<PaginatedResult<Order>> {
        return this.ordersService.findAll(query);
    }

    @Get('my')
    @ApiOperation({ summary: 'Đơn hàng của tài khoản đang đăng nhập' })
    findMine(
        @CurrentUser('id') userId: string,
        @Query() query: QueryOrderDto,
    ): Promise<PaginatedResult<Order>> {
        // Gán trực tiếp thay vì spread để giữ getter `skip` trên prototype
        query.userId = userId;
        return this.ordersService.findAll(query);
    }

    @Get('code/:code')
    @ApiOperation({ summary: 'Tra cứu đơn theo mã (quản trị)' })
    @RequirePermissions(PermissionCode.ORDERS_MANAGE)
    findByCode(@Param('code') code: string): Promise<Order> {
        return this.ordersService.findByCode(code);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Chi tiết đơn hàng — khách chỉ xem được đơn của mình' })
    findOne(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<Order> {
        return this.ordersService.findOneForUser(id, user);
    }

    @Patch(':id/status')
    @RequirePermissions(PermissionCode.ORDERS_MANAGE)
    @LogActivity({ action: ActivityAction.ORDER_STATUS_CHANGED, resource: 'order' })
    @ApiOperation({ summary: 'Đổi trạng thái đơn theo máy trạng thái (quản trị)' })
    updateStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateOrderStatusDto,
    ): Promise<Order> {
        return this.ordersService.updateStatus(id, dto.status, dto.reason);
    }

    @Patch(':id/payment-status')
    @RequirePermissions(PermissionCode.ORDERS_MANAGE)
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'order_payment' })
    @ApiOperation({ summary: 'Cập nhật trạng thái thanh toán (quản trị)' })
    updatePaymentStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdatePaymentStatusDto,
    ): Promise<Order> {
        return this.ordersService.updatePaymentStatus(id, dto.paymentStatus);
    }

    @Patch(':id/cancel')
    @LogActivity({ action: ActivityAction.ORDER_CANCELLED, resource: 'order' })
    @ApiOperation({ summary: 'Huỷ đơn — khách chỉ huỷ được đơn đang chờ xác nhận' })
    cancel(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: CancelOrderDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<Order> {
        return this.ordersService.cancelByCustomer(id, user, dto.reason);
    }
}
