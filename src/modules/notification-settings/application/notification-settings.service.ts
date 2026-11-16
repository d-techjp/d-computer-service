import { Injectable } from '@nestjs/common';
import { NotificationSettingsRepository } from '../domain/notification-settings.repository';
import type { UpdateNotificationSettingsDto } from '../dto/update-notification-settings.dto';
import { NotificationSettings } from '../entities/notification-settings.entity';

/** Singleton: `get` tự tạo bản ghi rỗng ở lần đọc đầu, `update` thay toàn bộ danh sách. */
@Injectable()
export class NotificationSettingsService {
    constructor(private readonly repository: NotificationSettingsRepository) {}

    async get(): Promise<NotificationSettings> {
        const existing = await this.repository.find();
        if (existing) return existing;
        return this.repository.save(this.repository.create({ orderNotifyEmails: [] }));
    }

    async update(dto: UpdateNotificationSettingsDto): Promise<NotificationSettings> {
        const settings = await this.get();
        settings.orderNotifyEmails = dto.orderNotifyEmails;
        return this.repository.save(settings);
    }
}
