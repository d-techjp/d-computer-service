import {
    BadRequestException,
    Controller,
    Headers,
    HttpCode,
    HttpStatus,
    Post,
    type RawBodyRequest,
    Req,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import Stripe from 'stripe';
import { Public } from '../../common/decorators/public.decorator';
import { PosTerminalService } from './application/pos-terminal.service';
import { StripeCheckoutService } from './application/stripe-checkout.service';
import { StripeGateway } from './infrastructure/stripe.gateway';

/**
 * Stripe gọi vào đây, không phải FE — không có token, xác thực bằng chữ ký
 * `Stripe-Signature` trên RAW body (cần `rawBody: true` ở `main.ts`; body đã
 * qua JSON.parse thì chữ ký không còn khớp).
 *
 * Đăng ký trên Dashboard các sự kiện: checkout.session.completed,
 * checkout.session.expired, checkout.session.async_payment_succeeded,
 * checkout.session.async_payment_failed, và payment_intent.succeeded (máy POS tại quầy).
 *
 * Lỗi xử lý để ném ra (5xx) — Stripe sẽ gửi lại, mọi bước đều idempotent.
 */
@ApiExcludeController()
@Public()
@Controller('payments/stripe')
export class StripeWebhookController {
    constructor(
        private readonly stripe: StripeGateway,
        private readonly stripeCheckoutService: StripeCheckoutService,
        private readonly posTerminalService: PosTerminalService,
    ) {}

    @Post('webhook')
    @HttpCode(HttpStatus.OK)
    async handle(
        @Req() req: RawBodyRequest<Request>,
        @Headers('stripe-signature') signature?: string,
    ): Promise<{ received: true }> {
        if (!req.rawBody || !signature) {
            throw new BadRequestException('Thiếu body hoặc chữ ký Stripe');
        }

        let event: Stripe.Event;
        try {
            event = this.stripe.constructWebhookEvent(req.rawBody, signature);
        } catch (error) {
            if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
                throw new BadRequestException('Chữ ký Stripe không hợp lệ');
            }
            throw error;
        }

        if (!(await this.posTerminalService.handleWebhookEvent(event))) {
            await this.stripeCheckoutService.handleWebhookEvent(event);
        }
        return { received: true };
    }
}
