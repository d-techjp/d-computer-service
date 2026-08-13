import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index } from 'typeorm';
import { SoftDeletableEntity } from '../../../common/entities/base.entity';
import type { CarouselFilters } from '../domain/carousel-filters';

/** Số sản phẩm tối đa một carousel đẩy ra trang chủ. */
export const CAROUSEL_MAX_ITEM_LIMIT = 24;
export const CAROUSEL_DEFAULT_ITEM_LIMIT = 12;

/**
 * Một dải sản phẩm có tên và slug, nội dung do bộ lọc quyết định chứ không phải
 * danh sách sản phẩm gắn tay — thêm hàng mới khớp bộ lọc là carousel tự có, không
 * ai phải vào sửa lại.
 *
 * Bộ lọc lưu hai dạng: `filters` (jsonb) là nguồn sự thật dùng để dựng truy vấn,
 * `filterQuery` là chuỗi query tương ứng do server sinh — xem `buildFilterQuery`.
 */
@Entity('carousels')
@Index('idx_carousels_active_sort', ['isActive', 'sortOrder'])
export class Carousel extends SoftDeletableEntity {
    @ApiProperty({ example: 'Laptop gaming dưới 30 triệu' })
    @Column({ type: 'varchar', length: 150 })
    name: string;

    @ApiProperty({ example: 'laptop-gaming-duoi-30-trieu' })
    @Index('uq_carousels_slug', { unique: true, where: '"deleted_at" IS NULL' })
    @Column({ type: 'varchar', length: 180 })
    slug: string;

    @ApiPropertyOptional({ example: 'Cấu hình mạnh, giá vừa túi tiền' })
    @Column({ type: 'varchar', length: 255, nullable: true })
    subtitle: string | null;

    @ApiPropertyOptional()
    @Column({ type: 'text', nullable: true })
    description: string | null;

    @ApiPropertyOptional({ description: 'Ảnh banner của carousel' })
    @Column({ type: 'varchar', length: 500, nullable: true })
    imageUrl: string | null;

    @ApiProperty({
        description: 'Bộ lọc đã lưu, dạng object — nguồn sự thật khi dựng truy vấn sản phẩm',
        default: {},
    })
    @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
    filters: CarouselFilters;

    @ApiProperty({
        description: 'Query string tương ứng `filters`, server sinh ra — không nhận từ client',
        example: 'categoryId=6f1c6c1e-9b0e-4a2a-9a1a-1b2c3d4e5f60&inStock=true',
    })
    @Column({ type: 'varchar', length: 1000, default: '' })
    filterQuery: string;

    @ApiProperty({
        default: CAROUSEL_DEFAULT_ITEM_LIMIT,
        description: 'Số sản phẩm đẩy ra trang chủ',
    })
    @Column({ type: 'int', default: CAROUSEL_DEFAULT_ITEM_LIMIT })
    itemLimit: number;

    @ApiProperty({ default: 0, description: 'Thứ tự hiển thị, nhỏ hơn đứng trước' })
    @Column({ type: 'int', default: 0 })
    sortOrder: number;

    @ApiProperty({ default: true })
    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    /**
     * KHÔNG phải cột: số sản phẩm hiển thị được khớp bộ lọc, tính tại thời điểm gọi
     * và chỉ khi admin xin (`withProductCount=true`) vì mỗi carousel tốn một truy vấn
     * đếm riêng. Không xin thì để `null` — phân biệt với "đếm ra 0".
     */
    @ApiPropertyOptional({
        nullable: true,
        description: 'Số sản phẩm khớp bộ lọc; null = chưa tính',
    })
    productCount?: number | null;
}
