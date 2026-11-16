import type { NotificationSettings } from '../entities/notification-settings.entity';

/** Port cho persistence của NotificationSettings — bảng tối đa một dòng (singleton). */
export abstract class NotificationSettingsRepository {
    abstract create(data: Partial<NotificationSettings>): NotificationSettings;

    abstract save(settings: NotificationSettings): Promise<NotificationSettings>;

    /** `null` nếu bảng chưa có dòng nào. */
    abstract find(): Promise<NotificationSettings | null>;
}
