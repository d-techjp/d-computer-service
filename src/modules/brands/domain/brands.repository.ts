import type { RepositoryPage } from '../../../common/interfaces/repository-page.interface';
import type { QueryBrandDto } from '../dto/query-brand.dto';
import type { Brand } from '../entities/brand.entity';

/**
 * Port (ranh giới domain) cho persistence của Brand. `BrandsService` chỉ biết
 * interface này — đổi Postgres sang DB khác chỉ cần viết adapter mới implement
 * lại đây, không đụng vào service/controller.
 *
 * Đây là abstract class (không phải TS `interface`) để dùng trực tiếp làm DI
 * token, cùng convention với `TokenVersionStore` đã có trong module auth.
 */
export abstract class BrandsRepository {
    /** Dựng entity trong bộ nhớ — không chạm DB (map với `Repository.create()` của TypeORM). */
    abstract create(data: Partial<Brand>): Brand;

    abstract save(brand: Brand): Promise<Brand>;

    abstract search(criteria: QueryBrandDto): Promise<RepositoryPage<Brand>>;

    abstract findById(id: string): Promise<Brand | null>;

    abstract findBySlug(slug: string): Promise<Brand | null>;

    abstract softRemove(brand: Brand): Promise<void>;

    /** Đếm bản ghi trùng slug, trừ `excludeId` — phục vụ vòng lặp sinh slug duy nhất. */
    abstract countBySlug(slug: string, excludeId?: string): Promise<number>;

    /** Số sản phẩm (chưa xoá) gán vào brand này — dùng chặn xoá khi đang được dùng. */
    abstract countProductsByBrandId(brandId: string): Promise<number>;
}
