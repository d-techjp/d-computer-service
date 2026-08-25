import { Body, Patch, Get } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { LogActivity } from '../../../common/decorators/activity-log.decorator';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { PermissionCode } from '../../../common/enums/permission.enum';
import { ActivityAction } from '../../activity-logs/enums/activity-action.enum';
import { SiteSettingsService } from '../application/site-settings.service';
import { UpdateSiteSettingsDto } from '../dto/update-site-settings.dto';
import { SiteSettings } from '../entities/site-settings.entity';

/**
 * Singleton — không có `:id`: `GET`/`PATCH` luôn thao tác trên bản ghi duy nhất,
 * tự tạo rỗng ở lần đọc đầu nếu chưa có (xem `SiteSettingsService.get()`).
 */
@AdminController('site-settings', 'Site Settings')
@RequirePermissions(PermissionCode.SITE_SETTINGS_MANAGE)
export class AdminSiteSettingsController {
    constructor(private readonly siteSettingsService: SiteSettingsService) {}

    @Get()
    @ApiOperation({ summary: 'Thông tin cửa hàng hiển thị ở footer storefront' })
    findOne(): Promise<SiteSettings> {
        return this.siteSettingsService.get();
    }

    @Patch()
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'site_settings' })
    @ApiOperation({
        summary: 'Cập nhật thông tin cửa hàng',
        description: 'Gửi `socialLinks` thì thay thế toàn bộ mảng cũ — bỏ trống để giữ nguyên.',
    })
    update(@Body() dto: UpdateSiteSettingsDto): Promise<SiteSettings> {
        return this.siteSettingsService.update(dto);
    }
}
