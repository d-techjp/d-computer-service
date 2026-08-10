import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import { slugify } from '../../../common/utils/slug.util';
import { CategoriesService } from '../../categories/application/categories.service';
import { ArticlesRepository } from '../domain/articles.repository';
import type { CreateArticleDto } from '../dto/create-article.dto';
import type { QueryArticleDto } from '../dto/query-article.dto';
import type { UpdateArticleDto } from '../dto/update-article.dto';
import { Article, ArticleStatus } from '../entities/article.entity';

@Injectable()
export class ArticlesService {
    constructor(
        private readonly articlesRepository: ArticlesRepository,
        private readonly categoriesService: CategoriesService,
    ) {}

    async create(dto: CreateArticleDto, authorId: string): Promise<Article> {
        if (dto.categoryId) await this.categoriesService.findOne(dto.categoryId);

        const status = dto.status ?? ArticleStatus.DRAFT;
        const article = this.articlesRepository.create({
            ...dto,
            authorId,
            slug: await this.resolveSlug(dto.slug ?? dto.title),
            status,
            publishedAt: status === ArticleStatus.PUBLISHED ? new Date() : null,
        });
        return this.articlesRepository.save(article);
    }

    async findAll(query: QueryArticleDto): Promise<PaginatedResult<Article>> {
        const page = await this.articlesRepository.search(query);
        return new PaginatedResult(page.items, page.total, query.page, query.limit);
    }

    async findOne(id: string): Promise<Article> {
        const article = await this.articlesRepository.findById(id);
        if (!article) throw new NotFoundException(`Không tìm thấy bài viết với id ${id}`);
        return article;
    }

    async findBySlug(slug: string, publishedOnly = true): Promise<Article> {
        const article = await this.articlesRepository.findBySlug(slug, publishedOnly);
        if (!article) throw new NotFoundException(`Không tìm thấy bài viết với slug ${slug}`);

        await this.articlesRepository.incrementViewCount(article.id);
        return article;
    }

    async update(id: string, dto: UpdateArticleDto): Promise<Article> {
        const article = await this.findOne(id);
        if (dto.categoryId) await this.categoriesService.findOne(dto.categoryId);

        if (dto.slug && dto.slug !== article.slug) {
            article.slug = await this.resolveSlug(dto.slug, id);
        } else if (dto.title && dto.title !== article.title && !dto.slug) {
            article.slug = await this.resolveSlug(dto.title, id);
        }

        // Lần đầu chuyển sang published thì đóng dấu thời điểm xuất bản
        if (
            dto.status === ArticleStatus.PUBLISHED &&
            article.status !== ArticleStatus.PUBLISHED &&
            !article.publishedAt
        ) {
            article.publishedAt = new Date();
        }

        const { slug: _slug, ...rest } = dto;
        Object.assign(article, rest);
        return this.articlesRepository.save(article);
    }

    async publish(id: string): Promise<Article> {
        const article = await this.findOne(id);
        if (article.status === ArticleStatus.PUBLISHED) return article;

        article.status = ArticleStatus.PUBLISHED;
        article.publishedAt ??= new Date();
        return this.articlesRepository.save(article);
    }

    async unpublish(id: string): Promise<Article> {
        const article = await this.findOne(id);
        article.status = ArticleStatus.DRAFT;
        return this.articlesRepository.save(article);
    }

    async remove(id: string): Promise<void> {
        await this.articlesRepository.softRemove(await this.findOne(id));
    }

    private async resolveSlug(source: string, excludeId?: string): Promise<string> {
        const base = slugify(source);
        if (!base) throw new BadRequestException('Không tạo được slug hợp lệ từ tiêu đề bài viết');

        let candidate = base;
        let suffix = 1;
        while ((await this.articlesRepository.countBySlug(candidate, excludeId)) > 0) {
            suffix += 1;
            candidate = `${base}-${suffix}`;
        }
        return candidate;
    }
}
