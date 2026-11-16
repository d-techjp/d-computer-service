import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminNotificationSettingsController } from './admin-notification-settings.controller';
import { NotificationSettingsService } from './application/notification-settings.service';
import { NotificationSettingsRepository } from './domain/notification-settings.repository';
import { NotificationSettings } from './entities/notification-settings.entity';
import { TypeOrmNotificationSettingsRepository } from './infrastructure/typeorm-notification-settings.repository';

@Module({
    imports: [TypeOrmModule.forFeature([NotificationSettings])],
    controllers: [AdminNotificationSettingsController],
    providers: [
        NotificationSettingsService,
        {
            provide: NotificationSettingsRepository,
            useClass: TypeOrmNotificationSettingsRepository,
        },
    ],
    exports: [NotificationSettingsService],
})
export class NotificationSettingsModule {}
