import type { RepositoryPage } from '../../../common/interfaces/repository-page.interface';
import type { QueryTiktokVideoDto } from '../dto/query-tiktok-video.dto';
import type { TiktokVideo } from '../entities/tiktok-video.entity';

/** Một dòng thứ tự mới trong lệnh sắp xếp lại. */
export interface TiktokVideoSortPosition {
    id: string;
    sortOrder: number;
}

/** Port cho persistence của TiktokVideo — cùng convention với `CarouselsRepository`. */
export abstract class TiktokVideosRepository {
    abstract create(data: Partial<TiktokVideo>): TiktokVideo;

    abstract save(video: TiktokVideo): Promise<TiktokVideo>;

    abstract search(criteria: QueryTiktokVideoDto): Promise<RepositoryPage<TiktokVideo>>;

    /** Video đang bật, sắp sẵn theo thứ tự hiển thị — nguồn dữ liệu cho storefront. */
    abstract findActive(): Promise<TiktokVideo[]>;

    abstract findById(id: string): Promise<TiktokVideo | null>;

    abstract softRemove(video: TiktokVideo): Promise<void>;

    abstract countByIds(ids: string[]): Promise<number>;

    /** Ghi lại toàn bộ thứ tự trong MỘT transaction: đổi chỗ thì hoặc trúng cả, hoặc không đổi gì. */
    abstract updateSortOrders(positions: TiktokVideoSortPosition[]): Promise<void>;

    /** `sortOrder` lớn nhất đang có — để video mới xuống cuối danh sách thay vì chen lên đầu. */
    abstract findMaxSortOrder(): Promise<number>;
}
