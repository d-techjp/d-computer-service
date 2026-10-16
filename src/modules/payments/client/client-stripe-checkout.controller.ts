import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LogActivity } from '../../../common/decorators/activity-log.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../../../common/guards/optional-jwt-auth.guard';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { ActivityAction } from '../../activity-logs/enums/activity-action.enum';
import { StripeCheckoutService } from '../application/stripe-checkout.service';
import {
    StripeCheckoutDto,
    StripeCheckoutResultDto,
    StripeSessionStatusDto,
} from './dto/stripe-checkout.dto';

/** Cùng kiểu xác thực với `ClientCheckoutController`: khách vãng lai vẫn thanh toán được. */
@ApiTags('Checkout')
@Public()
@UseGuards(OptionalJwtAuthGuard)
@Controller('checkout/stripe')
export class ClientStripeCheckoutController {
    constructor(private readonly stripeCheckoutService: StripeCheckoutService) {}

    @Post()
    @LogActivity({ action: ActivityAction.ORDER_PLACED, resource: 'order' })
    @ApiCreatedResponse({ type: StripeCheckoutResultDto })
    @ApiOperation({
        summary: 'Đặt hàng và thanh toán bằng thẻ / PayPay (Stripe Checkout)',
        description:
            'Tạo đơn `awaiting_payment` (chưa trừ kho) rồi trả `checkoutUrl` — FE chuyển ' +
            'hẳn trang sang URL này. Giỏ hàng CHƯA bị đóng: khách bấm quay lại trên Stripe ' +
            'thì vẫn dùng tiếp giỏ cũ. Thanh toán xong Stripe chuyển về ' +
            '`/{locale}/checkout/success?session_id=...`.',
    })
    start(
        @Body() dto: StripeCheckoutDto,
        @CurrentUser() user?: AuthenticatedUser,
    ): Promise<StripeCheckoutResultDto> {
        return this.stripeCheckoutService.startCheckout(dto, user);
    }

    @Get('sessions/:sessionId')
    @ApiOkResponse({ type: StripeSessionStatusDto })
    @ApiOperation({
        summary: 'Trạng thái đơn theo phiên Stripe — gọi từ trang success',
        description:
            'Đồng bộ luôn với Stripe nếu webhook chưa tới, nên ngay sau khi trả tiền đơn ' +
            'đã là `pending` + `paid`. Vẫn `awaiting_payment` nghĩa là tiền chưa về ' +
            '(hiếm, với thẻ/PayPay) — FE gọi lại sau vài giây.',
    })
    session(@Param('sessionId') sessionId: string): Promise<StripeSessionStatusDto> {
        return this.stripeCheckoutService.syncSession(sessionId);
    }
}
