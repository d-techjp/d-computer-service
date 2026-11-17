import { Body, Get, Patch } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { LogActivity } from '../../common/decorators/activity-log.decorator';
import { AdminController } from '../../common/decorators/admin-controller.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PermissionCode } from '../../common/enums/permission.enum';
import { ActivityAction } from '../activity-logs/enums/activity-action.enum';
import { PaymentSettingsService } from './application/payment-settings.service';
import { UpdatePaymentSettingsDto } from './dto/update-payment-settings.dto';
import { PaymentSettings } from './entities/payment-settings.entity';

/** Singleton, không có `:id`. Cùng quyền `settings.manage` với cấu hình thông báo. */
@AdminController('payment-settings', 'Payment Settings')
@RequirePermissions(PermissionCode.SETTINGS_MANAGE)
export class AdminPaymentSettingsController {
    constructor(private readonly paymentSettingsService: PaymentSettingsService) {}

    @Get()
    @ApiOperation({ summary: 'Phương thức thanh toán đang bật ở checkout' })
    findOne(): Promise<PaymentSettings> {
        return this.paymentSettingsService.get();
    }

    @Patch()
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'payment_settings' })
    @ApiOperation({
        summary: 'Bật/tắt phương thức thanh toán',
        description:
            'Phải còn ít nhất một phương thức. PayPay/Alipay chỉ bật khi Stripe đã duyệt — ' +
            'bật loại chưa duyệt là Stripe từ chối tạo phiên thanh toán.',
    })
    update(@Body() dto: UpdatePaymentSettingsDto): Promise<PaymentSettings> {
        return this.paymentSettingsService.update(dto);
    }
}
