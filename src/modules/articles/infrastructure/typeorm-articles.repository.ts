import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import type { RepositoryPage } from '../../../common/interfaces/repository-page.interface';
import { resolveSortColumn } from '../../../common/utils/query.util';
import { ArticlesRepository } from '../domain/articles.repository';
import type { QueryArticleDto } from '../dto/query-article.dto';
import { Article, ArticleStatus } from '../entities/article.entity';

const SORTABLE_COLUMNS = ['createdAt', 'updatedAt', 'publishedAt', 'title', 'viewCount'] as const;

@Injectable()
export class TypeOrmArticlesRepository extends ArticlesRepository {
    constructor(@InjectRepository(Article) private readonly repo: Repository<Article>) {
        super();
    }

    create(data: Partial<Article>): Article {
        return this.repo.create(data);
    }

    save(article: Article): Promise<Article> {
        return this.repo.save(article);
    }

    async search(criteria: QueryArticleDto): Promise<RepositoryPage<Article>> {
        const qb = this.repo
            .createQueryBuilder('article')
            .leftJoin('article.author', 'author')
            .addSelect(['author.id', 'author.fullName'])
            .leftJoin('article.category', 'category')
            .addSelect(['category.id', 'category.name', 'category.slug']);

        if (criteria.search) {
            qb.andWhere('(article.title ILIKE :search OR article.excerpt ILIKE :search)', {
                search: `%${criteria.search}%`,
            });
        }
        if (criteria.status) qb.andWhere('article.status = :status', { status: criteria.status });
        if (criteria.categoryId) {
            qb.andWhere('article.categoryId = :categoryId', { categoryId: criteria.categoryId });
        }
        if (criteria.authorId) {
            qb.andWhere('article.authorId = :authorId', { authorId: criteria.authorId });
        }
        if (criteria.tag) {
            // jsonb chứa phần tử tag -> dùng toán tử @>
            qb.andWhere('article.tags @> :tag::jsonb', { tag: JSON.stringify([criteria.tag]) });
        }

        const sortBy = resolveSortColumn(criteria.sortBy, SORTABLE_COLUMNS, 'createdAt');
        qb.orderBy(`article.${sortBy}`, criteria.sortOrder)
            .skip(criteria.skip)
            .take(criteria.limit);

        const [items, total] = await qb.getManyAndCount();
        return { items, total };
    }

    findById(id: string): Promise<Article | null> {
        return this.repo.findOne({ where: { id }, relations: { author: true, category: true } });
    }

    findBySlug(slug: string, publishedOnly: boolean): Promise<Article | null> {
        return this.repo.findOne({
            where: publishedOnly ? { slug, status: ArticleStatus.PUBLISHED } : { slug },
            relations: { author: true, category: true },
        });
    }

    async incrementViewCount(id: string): Promise<void> {
        await this.repo.increment({ id }, 'viewCount', 1);
    }

    async softRemove(article: Article): Promise<void> {
        await this.repo.softRemove(article);
    }

    countBySlug(slug: string, excludeId?: string): Promise<number> {
        return this.repo.count({ where: excludeId ? { slug, id: Not(excludeId) } : { slug } });
    }
}
