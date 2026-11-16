import type { RepositoryPage } from '../../../common/interfaces/repository-page.interface';
import type { QueryPageDto } from '../dto/query-page.dto';
import type { Page } from '../entities/page.entity';

export abstract class PagesRepository {
    abstract create(data: Partial<Page>): Page;

    abstract save(page: Page): Promise<Page>;

    abstract search(criteria: QueryPageDto): Promise<RepositoryPage<Page>>;

    abstract findById(id: string): Promise<Page | null>;

    abstract findPublishedBySlug(slug: string): Promise<Page | null>;

    abstract countBySlug(slug: string, excludeId?: string): Promise<number>;

    abstract softRemove(page: Page): Promise<void>;
}
