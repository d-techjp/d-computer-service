import { Body, Get, Patch } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { LogActivity } from '../../common/decorators/activity-log.decorator';
import { AdminController } from '../../common/decorators/admin-controller.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PermissionCode } from '../../common/enums/permission.enum';
import { ActivityAction } from '../activity-logs/enums/activity-action.enum';
import { NotificationSettingsService } from './application/notification-settings.service';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { NotificationSettings } from './entities/notification-settings.entity';

/** Singleton, không có `:id`. Quyền riêng `settings.manage` (mặc định chỉ admin). */
@AdminController('notification-settings', 'Notification Settings')
@RequirePermissions(PermissionCode.SETTINGS_MANAGE)
export class AdminNotificationSettingsController {
    constructor(private readonly notificationSettingsService: NotificationSettingsService) {}

    @Get()
    @ApiOperation({ summary: 'Cấu hình thông báo — hộp thư nhận email báo đơn mới' })
    findOne(): Promise<NotificationSettings> {
        return this.notificationSettingsService.get();
    }

    @Patch()
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'notification_settings' })
    @ApiOperation({
        summary: 'Cập nhật cấu hình thông báo',
        description: '`orderNotifyEmails` thay thế toàn bộ danh sách cũ, tối đa 3 địa chỉ.',
    })
    update(@Body() dto: UpdateNotificationSettingsDto): Promise<NotificationSettings> {
        return this.notificationSettingsService.update(dto);
    }
}
