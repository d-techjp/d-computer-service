import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminSiteSettingsController } from './admin/admin-site-settings.controller';
import { SiteSettingsService } from './application/site-settings.service';
import { ClientSiteSettingsController } from './client/client-site-settings.controller';
import { ClientSiteSettingsService } from './client/client-site-settings.service';
import { SiteSettingsRepository } from './domain/site-settings.repository';
import { SiteSettings } from './entities/site-settings.entity';
import { TypeOrmSiteSettingsRepository } from './infrastructure/typeorm-site-settings.repository';

@Module({
    imports: [TypeOrmModule.forFeature([SiteSettings])],
    controllers: [ClientSiteSettingsController, AdminSiteSettingsController],
    providers: [
        SiteSettingsService,
        ClientSiteSettingsService,
        { provide: SiteSettingsRepository, useClass: TypeOrmSiteSettingsRepository },
    ],
    exports: [SiteSettingsService],
})
export class SiteSettingsModule {}
