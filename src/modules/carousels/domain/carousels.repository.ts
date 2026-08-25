import type { RepositoryPage } from '../../../common/interfaces/repository-page.interface';
import type { QueryCarouselDto } from '../dto/query-carousel.dto';
import type { Carousel } from '../entities/carousel.entity';

/** Một dòng thứ tự mới trong lệnh sắp xếp lại. */
export interface CarouselSortPosition {
    id: string;
    sortOrder: number;
}

/**
 * Port (ranh giới domain) cho persistence của Carousel — cùng convention với
 * `BrandsRepository`: abstract class để dùng thẳng làm DI token.
 */
export abstract class CarouselsRepository {
    abstract create(data: Partial<Carousel>): Carousel;

    abstract save(carousel: Carousel): Promise<Carousel>;

    abstract search(criteria: QueryCarouselDto): Promise<RepositoryPage<Carousel>>;

    /** Carousel đang bật, sắp sẵn theo thứ tự hiển thị — nguồn dữ liệu dựng trang chủ. */
    abstract findActive(): Promise<Carousel[]>;

    abstract findById(id: string): Promise<Carousel | null>;

    abstract findBySlug(slug: string): Promise<Carousel | null>;

    abstract softRemove(carousel: Carousel): Promise<void>;

    /** Đếm bản ghi trùng slug, trừ `excludeId` — phục vụ vòng lặp sinh slug duy nhất. */
    abstract countBySlug(slug: string, excludeId?: string): Promise<number>;

    abstract countByIds(ids: string[]): Promise<number>;

    /** Ghi lại toàn bộ thứ tự trong MỘT transaction: đổi chỗ thì hoặc trúng cả, hoặc không đổi gì. */
    abstract updateSortOrders(positions: CarouselSortPosition[]): Promise<void>;

    /** `sortOrder` lớn nhất hiện có, `-1` nếu chưa có carousel nào — dùng đẩy carousel mới xuống cuối. */
    abstract findMaxSortOrder(): Promise<number>;
}
