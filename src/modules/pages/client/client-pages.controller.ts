import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { PagesService } from '../application/pages.service';
import { Page } from '../entities/page.entity';

/**
 * Storefront chỉ đọc từng trang theo slug, và chỉ trang đã xuất bản — phạm vi
 * này nằm trong `findPublishedBySlug`, không có tham số nào để client nới ra.
 * Không có danh sách: storefront không cần, và đỡ phải siết thêm một endpoint.
 */
@ApiTags('Pages')
@Public()
@Controller('pages')
export class ClientPagesController {
    constructor(private readonly pagesService: PagesService) {}

    @Get('slug/:slug')
    @ApiOperation({ summary: 'Trang tĩnh đã xuất bản theo slug' })
    findBySlug(@Param('slug') slug: string): Promise<Page> {
        return this.pagesService.findPublishedBySlug(slug);
    }
}
