import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { SiteSettingsRepository } from '../domain/site-settings.repository';
import type { UpdateSiteSettingsDto } from '../dto/update-site-settings.dto';
import { SiteSettings } from '../entities/site-settings.entity';

/**
 * Singleton — không có `create`/`remove` ở tầng nghiệp vụ, chỉ `get` (tự khởi
 * tạo bản ghi rỗng ở lần đọc đầu) và `update` (PATCH toàn phần).
 */
@Injectable()
export class SiteSettingsService {
    constructor(private readonly siteSettingsRepository: SiteSettingsRepository) {}

    async get(): Promise<SiteSettings> {
        const existing = await this.siteSettingsRepository.find();
        if (existing) return existing;

        return this.siteSettingsRepository.save(
            this.siteSettingsRepository.create({
                companyName: '',
                phone: '',
                address: '',
                socialLinks: [],
                footerColumns: [],
            }),
        );
    }

    async update(dto: UpdateSiteSettingsDto): Promise<SiteSettings> {
        const settings = await this.get();
        const { socialLinks, footerColumns, ...rest } = dto;
        Object.assign(settings, rest);

        // Thay nguyên cụm, không merge từng phần tử — merge thì không có cách
        // nào gỡ một link/cột đang có. Phần tử chưa có `id` (thêm mới ở form)
        // được server sinh id ở đây thay vì bắt FE tự sinh UUID.
        if (socialLinks) {
            settings.socialLinks = socialLinks.map((link) => ({
                id: link.id ?? randomUUID(),
                name: link.name,
                logoUrl: link.logoUrl,
                url: link.url,
            }));
        }

        if (footerColumns) {
            settings.footerColumns = footerColumns.map((column) => ({
                id: column.id ?? randomUUID(),
                title: column.title,
                links: column.links.map((link) => ({
                    id: link.id ?? randomUUID(),
                    label: link.label,
                    url: link.url,
                })),
            }));
        }

        return this.siteSettingsRepository.save(settings);
    }
}
