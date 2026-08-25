import type { SiteSettings } from '../entities/site-settings.entity';

/**
 * Port cho persistence của SiteSettings — bảng chỉ có TỐI ĐA một dòng (singleton),
 * nên khác các repository khác ở chỗ không có `id` truyền vào bất kỳ method nào.
 */
export abstract class SiteSettingsRepository {
    abstract create(data: Partial<SiteSettings>): SiteSettings;

    abstract save(settings: SiteSettings): Promise<SiteSettings>;

    /** `null` nếu bảng chưa có dòng nào — chưa từng lưu qua `SiteSettingsService.get()`. */
    abstract find(): Promise<SiteSettings | null>;
}
