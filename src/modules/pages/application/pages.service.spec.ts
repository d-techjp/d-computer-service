import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { PagesRepository } from '../domain/pages.repository';
import { Page, PageStatus } from '../entities/page.entity';
import { PagesService } from './pages.service';

const makePage = (overrides: Partial<Page> = {}): Page =>
    Object.assign(new Page(), {
        id: 'page-1',
        title: 'プライバシーポリシー',
        slug: 'privacy',
        content: '<p>本文です。</p>',
        status: PageStatus.DRAFT,
        publishedAt: null,
        metaTitle: null,
        metaDescription: null,
        ...overrides,
    });

describe('PagesService', () => {
    // Mỗi method là một jest.Mock thuần: `expect(repo.save)` không bị lint coi là method tách khỏi object
    let repo: Record<keyof PagesRepository, jest.Mock>;
    let service: PagesService;

    beforeEach(() => {
        repo = {
            create: jest.fn((data: Partial<Page>) => makePage(data)),
            save: jest.fn((page: Page) => Promise.resolve(page)),
            search: jest.fn(),
            findById: jest.fn().mockResolvedValue(makePage()),
            findPublishedBySlug: jest.fn().mockResolvedValue(null),
            countBySlug: jest.fn().mockResolvedValue(0),
            softRemove: jest.fn(),
        };
        service = new PagesService(repo);
    });

    const dto = { title: 'プライバシーポリシー', slug: 'privacy', content: '<p>本文です。</p>' };

    it('tạo trang nháp mặc định, chưa có publishedAt', async () => {
        const page = await service.create(dto);
        expect(page.status).toBe(PageStatus.DRAFT);
        expect(page.publishedAt).toBeNull();
    });

    it('tạo trang xuất bản ngay thì đóng dấu publishedAt', async () => {
        const page = await service.create({ ...dto, status: PageStatus.PUBLISHED });
        expect(page.publishedAt).toBeInstanceOf(Date);
    });

    it('chặn slug trùng route có sẵn của storefront', async () => {
        await expect(service.create({ ...dto, slug: 'products' })).rejects.toBeInstanceOf(
            BadRequestException,
        );
        expect(repo.save).not.toHaveBeenCalled();
    });

    it('báo trùng thay vì tự thêm hậu tố khi slug đã có trang dùng', async () => {
        repo.countBySlug.mockResolvedValue(1);
        await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    });

    it('đổi title không đổi slug', async () => {
        const page = await service.update('page-1', { title: '個人情報保護方針' });
        expect(page.slug).toBe('privacy');
        expect(repo.countBySlug).not.toHaveBeenCalled();
    });

    it('đổi slug thì kiểm tra trùng, bỏ qua chính trang đang sửa', async () => {
        await service.update('page-1', { slug: 'privacy-policy' });
        expect(repo.countBySlug).toHaveBeenCalledWith('privacy-policy', 'page-1');
    });

    it('xuất bản lại giữ nguyên thời điểm xuất bản lần đầu', async () => {
        const first = new Date('2026-01-01T00:00:00Z');
        repo.findById.mockResolvedValue(makePage({ publishedAt: first }));
        const page = await service.publish('page-1');
        expect(page.status).toBe(PageStatus.PUBLISHED);
        expect(page.publishedAt).toBe(first);
    });

    it('storefront nhận 404 cho trang nháp hoặc không tồn tại', async () => {
        await expect(service.findPublishedBySlug('privacy')).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });
});
