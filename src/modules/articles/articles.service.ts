import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { PaginatedResult } from '../../common/dto/paginated-result.dto';
import { resolveSortColumn } from '../../common/utils/query.util';
import { slugify } from '../../common/utils/slug.util';
import { CategoriesService } from '../categories/categories.service';
import type { CreateArticleDto } from './dto/create-article.dto';
import type { QueryArticleDto } from './dto/query-article.dto';
import type { UpdateArticleDto } from './dto/update-article.dto';
import { Article, ArticleStatus } from './entities/article.entity';

const SORTABLE_COLUMNS = ['createdAt', 'updatedAt', 'publishedAt', 'title', 'viewCount'] as const;

@Injectable()
export class ArticlesService {
    constructor(
        @InjectRepository(Article) private readonly articlesRepository: Repository<Article>,
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
        const qb = this.articlesRepository
            .createQueryBuilder('article')
            .leftJoin('article.author', 'author')
            .addSelect(['author.id', 'author.fullName'])
            .leftJoin('article.category', 'category')
            .addSelect(['category.id', 'category.name', 'category.slug']);

        if (query.search) {
            qb.andWhere('(article.title ILIKE :search OR article.excerpt ILIKE :search)', {
                search: `%${query.search}%`,
            });
        }
        if (query.status) qb.andWhere('article.status = :status', { status: query.status });
        if (query.categoryId) {
            qb.andWhere('article.categoryId = :categoryId', { categoryId: query.categoryId });
        }
        if (query.authorId)
            qb.andWhere('article.authorId = :authorId', { authorId: query.authorId });
        if (query.tag) {
            // jsonb chứa phần tử tag -> dùng toán tử @>
            qb.andWhere('article.tags @> :tag::jsonb', { tag: JSON.stringify([query.tag]) });
        }

        const sortBy = resolveSortColumn(query.sortBy, SORTABLE_COLUMNS, 'createdAt');
        qb.orderBy(`article.${sortBy}`, query.sortOrder).skip(query.skip).take(query.limit);

        const [items, total] = await qb.getManyAndCount();
        return new PaginatedResult(items, total, query.page, query.limit);
    }

    /** Danh sách công khai: chỉ bài đã xuất bản. */
    findPublished(query: QueryArticleDto): Promise<PaginatedResult<Article>> {
        query.status = ArticleStatus.PUBLISHED;
        return this.findAll(query);
    }

    async findOne(id: string): Promise<Article> {
        const article = await this.articlesRepository.findOne({
            where: { id },
            relations: { author: true, category: true },
        });
        if (!article) throw new NotFoundException(`Không tìm thấy bài viết với id ${id}`);
        return article;
    }

    async findBySlug(slug: string, publishedOnly = true): Promise<Article> {
        const article = await this.articlesRepository.findOne({
            where: publishedOnly ? { slug, status: ArticleStatus.PUBLISHED } : { slug },
            relations: { author: true, category: true },
        });
        if (!article) throw new NotFoundException(`Không tìm thấy bài viết với slug ${slug}`);

        await this.articlesRepository.increment({ id: article.id }, 'viewCount', 1);
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
        while (
            (await this.articlesRepository.count({
                where: excludeId ? { slug: candidate, id: Not(excludeId) } : { slug: candidate },
            })) > 0
        ) {
            suffix += 1;
            candidate = `${base}-${suffix}`;
        }
        return candidate;
    }
}
