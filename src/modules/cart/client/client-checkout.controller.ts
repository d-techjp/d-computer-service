import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LogActivity } from '../../../common/decorators/activity-log.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../../../common/guards/optional-jwt-auth.guard';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { ActivityAction } from '../../activity-logs/enums/activity-action.enum';
import type { Order } from '../../orders/entities/order.entity';
import { type CheckoutPreview, CheckoutService } from '../application/checkout.service';
import { CheckoutPreviewDto } from '../dto/checkout-preview.dto';
import { PlaceOrderDto } from '../dto/place-order.dto';

/** Xem `ClientCartsController` cho lý do dùng `@Public()` + `OptionalJwtAuthGuard`. */
@ApiTags('Checkout')
@Public()
@UseGuards(OptionalJwtAuthGuard)
@Controller('checkout')
export class ClientCheckoutController {
    constructor(private readonly checkoutService: CheckoutService) {}

    // 200 chứ không phải 201: chỉ tính toán, không tạo gì cả. Dùng POST thay GET
    // vì địa chỉ giao hàng là dữ liệu cá nhân, không nên nằm trên query string
    // (lọt vào log truy cập, lịch sử trình duyệt, referer).
    @Post('preview')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Tính tiền đơn hàng từ giỏ (sau khi khách nhập địa chỉ)',
        description:
            'Bắt buộc có `shippingAddress` — đúng luồng "nhập địa chỉ + số điện thoại xong mới ' +
            'hiện thông tin tiền, rồi mới tới nút đặt hàng". Không tạo đơn, không trừ kho.',
    })
    preview(
        @Body() dto: CheckoutPreviewDto,
        @CurrentUser() user?: AuthenticatedUser,
    ): Promise<CheckoutPreview> {
        return this.checkoutService.preview(dto, user);
    }

    @Post()
    @LogActivity({ action: ActivityAction.ORDER_PLACED, resource: 'order' })
    @ApiOperation({
        summary: 'Đặt hàng',
        description:
            'Đơn ra đời với trạng thái `pending` (Chờ xác nhận) và hiện ngay ở trang quản trị. ' +
            'Không đăng nhập vẫn đặt được — khi đó `userId = null`, khách tra cứu bằng `code` ' +
            'của đơn. Giỏ hàng sau đó bị đóng, `GET /carts/:cartId` trả 404.',
    })
    placeOrder(
        @Body() dto: PlaceOrderDto,
        @CurrentUser() user?: AuthenticatedUser,
    ): Promise<Order> {
        return this.checkoutService.placeOrder(dto, user);
    }
}
