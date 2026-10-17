import { Body, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { LogActivity } from '../../../common/decorators/activity-log.decorator';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { PermissionCode } from '../../../common/enums/permission.enum';
import { ActivityAction } from '../../activity-logs/enums/activity-action.enum';
import { Order } from '../../orders/entities/order.entity';
import { PosTerminalService } from '../application/pos-terminal.service';
import {
    CancelPosOrderDto,
    CreatePosOrderDto,
    PosCustomerDto,
    PosCustomerQueryDto,
    PosPaymentStatusDto,
    PosReaderInputDto,
    PosReadersDto,
    SimulatePosTapDto,
} from './dto/pos.dto';

/** Bán tại quầy + thu tiền qua máy POS. Cùng quyền với quản lý đơn hàng. */
@AdminController('pos', 'POS')
@RequirePermissions(PermissionCode.ORDERS_MANAGE)
export class AdminPosController {
    constructor(private readonly posService: PosTerminalService) {}

    @Get('readers')
    @ApiOkResponse({ type: PosReadersDto })
    @ApiOperation({ summary: 'Danh sách máy POS đã đăng ký trên Stripe' })
    readers(): Promise<PosReadersDto> {
        return this.posService.listReaders();
    }

    @Get('customers')
    @ApiOkResponse({ type: [PosCustomerDto] })
    @ApiOperation({
        summary: 'Gợi ý khách hàng theo số điện thoại',
        description: 'So khớp bỏ qua dấu gạch/khoảng trắng; dưới 3 chữ số trả mảng rỗng.',
    })
    customers(@Query() query: PosCustomerQueryDto): Promise<PosCustomerDto[]> {
        return this.posService.searchCustomers(query.phone);
    }

    @Post('orders')
    @LogActivity({ action: ActivityAction.ORDER_PLACED, resource: 'order' })
    @ApiCreatedResponse({ type: Order })
    @ApiOperation({
        summary: 'Lên đơn tại quầy',
        description:
            'Đơn `in_store` + `awaiting_payment`, CHƯA trừ kho. Gọi tiếp ' +
            '`POST /admin/pos/orders/:id/collect` để đẩy số tiền xuống máy POS.',
    })
    createOrder(@Body() dto: CreatePosOrderDto): Promise<Order> {
        return this.posService.createOrder(dto);
    }

    @Post('orders/:id/collect')
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ type: PosPaymentStatusDto })
    @ApiOperation({
        summary: 'Đẩy số tiền xuống máy POS',
        description:
            'Máy hiện số tiền và chờ khách chạm thẻ. Thẻ bị từ chối thì gọi lại để thu lần nữa.',
    })
    collect(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: PosReaderInputDto,
    ): Promise<PosPaymentStatusDto> {
        return this.posService.collect(id, dto.readerId);
    }

    @Get('orders/:id/payment')
    @ApiOkResponse({ type: PosPaymentStatusDto })
    @ApiOperation({
        summary: 'Trạng thái thanh toán — admin poll trong lúc chờ khách chạm thẻ',
        description:
            'Dừng poll khi `paymentStatus = paid`, hoặc `readerAction.status = failed` ' +
            '(hiện `failureMessage`, cho thu lại).',
    })
    status(
        @Param('id', ParseUUIDPipe) id: string,
        @Query() query: PosReaderInputDto,
    ): Promise<PosPaymentStatusDto> {
        return this.posService.status(id, query.readerId);
    }

    @Post('orders/:id/cancel-collect')
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ type: PosPaymentStatusDto })
    @ApiOperation({ summary: 'Dừng thu tiền trên máy — đơn vẫn chờ thanh toán' })
    cancelCollect(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: PosReaderInputDto,
    ): Promise<PosPaymentStatusDto> {
        return this.posService.cancelCollect(id, dto.readerId);
    }

    @Post('orders/:id/cancel')
    @HttpCode(HttpStatus.OK)
    @LogActivity({ action: ActivityAction.ORDER_CANCELLED, resource: 'order' })
    @ApiOkResponse({ type: PosPaymentStatusDto })
    @ApiOperation({ summary: 'Huỷ đơn tại quầy chưa thanh toán' })
    cancel(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: CancelPosOrderDto,
    ): Promise<PosPaymentStatusDto> {
        return this.posService.cancelOrder(id, dto);
    }

    @Post('orders/:id/simulate-tap')
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ type: PosPaymentStatusDto })
    @ApiOperation({
        summary: '[Sandbox] Giả lập khách chạm thẻ trên reader ảo',
        description: 'Chỉ chạy với khoá `sk_test_`. Thẻ `4000000000000002` để thử bị từ chối.',
    })
    simulateTap(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: SimulatePosTapDto,
    ): Promise<PosPaymentStatusDto> {
        return this.posService.simulateTap(id, dto.readerId, dto.cardNumber);
    }
}
