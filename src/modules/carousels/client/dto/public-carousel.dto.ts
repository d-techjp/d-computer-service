import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationMeta } from '../../../../common/dto/paginated-result.dto';
import { Product } from '../../../products/entities/product.entity';
import type { CarouselFilters } from '../../domain/carousel-filters';
import { Carousel } from '../../entities/carousel.entity';

/**
 * Bản carousel dành cho storefront. Không có `isActive`/`deletedAt` (chuyện quản trị),
 * nhưng CÓ `filterQuery`: client dán thẳng chuỗi đó vào `GET /products?...` để dựng
 * trang danh sách với bộ lọc/facet sẵn có, khỏi phải tự dịch `filters` sang query.
 */
export class PublicCarouselDto {
    @ApiProperty({ format: 'uuid' }) id: string;
    @ApiProperty({ example: 'Laptop gaming dưới 30 triệu' }) name: string;
    @ApiProperty({ example: 'laptop-gaming-duoi-30-trieu' }) slug: string;
    @ApiPropertyOptional({ nullable: true }) subtitle: string | null;
    @ApiPropertyOptional({ nullable: true }) description: string | null;
    @ApiPropertyOptional({ nullable: true }) imageUrl: string | null;

    @ApiProperty({
        description: 'Bộ lọc đang áp, dạng object — dùng hiện chip "đang lọc theo ..."',
    })
    filters: CarouselFilters;

    @ApiProperty({
        description: 'Chính bộ lọc đó dạng query string, ghép thẳng vào `GET /products?...`',
        example:
            'categoryId=6f1c6c1e-9b0e-4a2a-9a1a-1b2c3d4e5f60&inStock=true&sortBy=soldCount&sortOrder=DESC',
    })
    filterQuery: string;

    @ApiProperty({ description: 'Số sản phẩm carousel đẩy ra trang chủ' }) itemLimit: number;
    @ApiProperty() sortOrder: number;
    @ApiProperty() createdAt: Date;
    @ApiProperty() updatedAt: Date;

    @ApiPropertyOptional({
        type: [Product],
        description: 'Chỉ có mặt khi gọi danh sách với `includeProducts=true`',
    })
    products?: Product[];
}

/** Một lần gọi ra đủ thứ để render slide: danh tính carousel + sản phẩm + phân trang. */
export class CarouselProductsDto {
    @ApiProperty({ type: PublicCarouselDto }) carousel: PublicCarouselDto;

    @ApiProperty({ type: [Product], description: 'Khuôn dạng y hệt item của `GET /products`' })
    items: Product[];

    @ApiProperty({ type: PaginationMeta }) meta: PaginationMeta;
}

export const toPublicCarousel = (carousel: Carousel, products?: Product[]): PublicCarouselDto => ({
    id: carousel.id,
    name: carousel.name,
    slug: carousel.slug,
    subtitle: carousel.subtitle,
    description: carousel.description,
    imageUrl: carousel.imageUrl,
    filters: carousel.filters,
    filterQuery: carousel.filterQuery,
    itemLimit: carousel.itemLimit,
    sortOrder: carousel.sortOrder,
    createdAt: carousel.createdAt,
    updatedAt: carousel.updatedAt,
    ...(products ? { products } : {}),
});
