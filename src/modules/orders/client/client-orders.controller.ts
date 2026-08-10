import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LogActivity } from '../../../common/decorators/activity-log.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { ActivityAction } from '../../activity-logs/enums/activity-action.enum';
import { OrdersService } from '../application/orders.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { CancelOrderDto } from '../dto/update-order-status.dto';
import { Order } from '../entities/order.entity';
import { ClientOrdersService } from './client-orders.service';
import { ClientQueryOrderDto } from './dto/client-query-order.dto';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class ClientOrdersController {
    constructor(
        private readonly ordersService: OrdersService,
        private readonly clientOrdersService: ClientOrdersService,
    ) {}

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
    @ApiOperation({ summary: 'Đơn hàng của tài khoản đang đăng nhập' })
    findMine(
        @CurrentUser('id') userId: string,
        @Query() query: ClientQueryOrderDto,
    ): Promise<PaginatedResult<Order>> {
        return this.clientOrdersService.findMine(query, userId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Chi tiết đơn hàng — khách chỉ xem được đơn của mình' })
    findOne(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<Order> {
        return this.ordersService.findOneForUser(id, user);
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
