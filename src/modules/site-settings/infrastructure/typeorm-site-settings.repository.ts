import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteSettingsRepository } from '../domain/site-settings.repository';
import { SiteSettings } from '../entities/site-settings.entity';

/** Adapter TypeORM/Postgres cho `SiteSettingsRepository`. */
@Injectable()
export class TypeOrmSiteSettingsRepository extends SiteSettingsRepository {
    constructor(@InjectRepository(SiteSettings) private readonly repo: Repository<SiteSettings>) {
        super();
    }

    create(data: Partial<SiteSettings>): SiteSettings {
        return this.repo.create(data);
    }

    save(settings: SiteSettings): Promise<SiteSettings> {
        return this.repo.save(settings);
    }

    async find(): Promise<SiteSettings | null> {
        // Bảng chỉ có tối đa 1 dòng — `createdAt ASC` để nếu lỡ có nhiều hơn
        // (không nên xảy ra) thì luôn lấy đúng bản ghi gốc, ổn định giữa các lần gọi.
        const [settings] = await this.repo.find({ order: { createdAt: 'ASC' }, take: 1 });
        return settings ?? null;
    }
}
