import type { RepositoryPage } from '../../../common/interfaces/repository-page.interface';
import type { QueryArticleDto } from '../dto/query-article.dto';
import type { Article } from '../entities/article.entity';

export abstract class ArticlesRepository {
    abstract create(data: Partial<Article>): Article;

    abstract save(article: Article): Promise<Article>;

    abstract search(criteria: QueryArticleDto): Promise<RepositoryPage<Article>>;

    abstract findById(id: string): Promise<Article | null>;

    abstract findBySlug(slug: string, publishedOnly: boolean): Promise<Article | null>;

    abstract incrementViewCount(id: string): Promise<void>;

    abstract softRemove(article: Article): Promise<void>;

    abstract countBySlug(slug: string, excludeId?: string): Promise<number>;
}
