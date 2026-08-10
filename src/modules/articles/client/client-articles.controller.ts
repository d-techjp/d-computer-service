import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import { Article } from '../entities/article.entity';
import { ClientArticlesService } from './client-articles.service';
import { ClientQueryArticleDto } from './dto/client-query-article.dto';

@ApiTags('Articles')
@Public()
@Controller('articles')
export class ClientArticlesController {
    constructor(private readonly articlesService: ClientArticlesService) {}

    @Get()
    @ApiOperation({ summary: 'Danh sách bài viết đã xuất bản' })
    findAll(@Query() query: ClientQueryArticleDto): Promise<PaginatedResult<Article>> {
        return this.articlesService.findAll(query);
    }

    @Get('slug/:slug')
    @ApiOperation({ summary: 'Chi tiết bài viết theo slug, tự tăng lượt xem' })
    findBySlug(@Param('slug') slug: string): Promise<Article> {
        return this.articlesService.findBySlug(slug);
    }
}
