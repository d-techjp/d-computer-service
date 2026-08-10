import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import { ArticlesService } from '../application/articles.service';
import type { QueryArticleDto } from '../dto/query-article.dto';
import { Article, ArticleStatus } from '../entities/article.entity';
import type { ClientQueryArticleDto } from './dto/client-query-article.dto';

/** Lớp mỏng bọc `ArticlesService` cho storefront: chỉ thấy bài đã xuất bản. */
@Injectable()
export class ClientArticlesService {
    constructor(private readonly articlesService: ArticlesService) {}

    findAll(query: ClientQueryArticleDto): Promise<PaginatedResult<Article>> {
        // Gán trực tiếp lên instance thay vì spread để giữ getter `skip` trên prototype
        const criteria: QueryArticleDto = Object.assign(query, {
            status: ArticleStatus.PUBLISHED,
        });
        return this.articlesService.findAll(criteria);
    }

    /** `publishedOnly = true` -> repository tự loại bài nháp, khách gọi slug bài nháp sẽ nhận 404. */
    findBySlug(slug: string): Promise<Article> {
        return this.articlesService.findBySlug(slug, true);
    }
}
