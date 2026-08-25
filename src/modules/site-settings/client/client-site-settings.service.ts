import { Injectable } from '@nestjs/common';
import { SiteSettingsService } from '../application/site-settings.service';
import { toPublicSiteSettings, type PublicSiteSettingsDto } from './dto/public-site-settings.dto';

/** Lớp mỏng bọc `SiteSettingsService` cho storefront: cắt bỏ phần dữ liệu quản trị. */
@Injectable()
export class ClientSiteSettingsService {
    constructor(private readonly siteSettingsService: SiteSettingsService) {}

    async find(): Promise<PublicSiteSettingsDto> {
        return toPublicSiteSettings(await this.siteSettingsService.get());
    }
}
