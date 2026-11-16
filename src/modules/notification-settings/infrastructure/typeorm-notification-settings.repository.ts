import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationSettingsRepository } from '../domain/notification-settings.repository';
import { NotificationSettings } from '../entities/notification-settings.entity';

/** Adapter TypeORM/Postgres cho `NotificationSettingsRepository`. */
@Injectable()
export class TypeOrmNotificationSettingsRepository extends NotificationSettingsRepository {
    constructor(
        @InjectRepository(NotificationSettings)
        private readonly repo: Repository<NotificationSettings>,
    ) {
        super();
    }

    create(data: Partial<NotificationSettings>): NotificationSettings {
        return this.repo.create(data);
    }

    save(settings: NotificationSettings): Promise<NotificationSettings> {
        return this.repo.save(settings);
    }

    async find(): Promise<NotificationSettings | null> {
        // `createdAt ASC` để lỡ có nhiều dòng thì luôn lấy đúng bản ghi gốc
        const [settings] = await this.repo.find({ order: { createdAt: 'ASC' }, take: 1 });
        return settings ?? null;
    }
}
