import { Injectable, NotFoundException } from '@nestjs/common';
import type { Product } from '../../products/entities/product.entity';
import { CarouselProductsService } from '../application/carousel-products.service';
import { CarouselsService } from '../application/carousels.service';
import { Carousel } from '../entities/carousel.entity';
import type { ClientCarouselProductsDto } from './dto/client-carousel-products.dto';
import type { ClientQueryCarouselDto } from './dto/client-query-carousel.dto';
import {
    toPublicCarousel,
    type CarouselProductsDto,
    type PublicCarouselDto,
} from './dto/public-carousel.dto';

/**
 * Lớp mỏng bọc `CarouselsService` cho storefront: chỉ carousel đang bật, và cắt bỏ
 * phần dữ liệu quản trị trước khi trả ra.
 */
@Injectable()
export class ClientCarouselsService {
    constructor(
        private readonly carouselsService: CarouselsService,
        private readonly carouselProductsService: CarouselProductsService,
    ) {}

    async findAll(query: ClientQueryCarouselDto): Promise<PublicCarouselDto[]> {
        const carousels = await this.carouselsService.findActive();
        if (!query.includeProducts) return carousels.map((carousel) => toPublicCarousel(carousel));

        // Mỗi carousel một truy vấn sản phẩm — chạy song song vì chúng độc lập nhau
        return Promise.all(
            carousels.map(async (carousel) =>
                toPublicCarousel(carousel, await this.loadProducts(carousel, query.productLimit)),
            ),
        );
    }

    async findBySlug(slug: string): Promise<PublicCarouselDto> {
        return toPublicCarousel(await this.findVisibleBySlug(slug));
    }

    /**
     * Một lần gọi ra đủ thứ để render slide: FE có `name`/`id` để dựng tiêu đề và
     * `filterQuery` để làm link "Xem tất cả" sang `/products?...`, khỏi phải gọi
     * thêm endpoint chi tiết carousel.
     */
    async findProducts(
        slug: string,
        query: ClientCarouselProductsDto,
    ): Promise<CarouselProductsDto> {
        const carousel = await this.findVisibleBySlug(slug);
        const page = await this.carouselProductsService.listProducts(carousel.filters, query);

        return { carousel: toPublicCarousel(carousel), items: page.items, meta: page.meta };
    }

    private async loadProducts(carousel: Carousel, productLimit?: number): Promise<Product[]> {
        const page = await this.carouselProductsService.listProducts(carousel.filters, {
            page: 1,
            limit: productLimit ?? carousel.itemLimit,
        });
        return page.items;
    }

    /** Carousel đã tắt coi như không tồn tại với khách — 404 thay vì 403, không lộ sự tồn tại. */
    private async findVisibleBySlug(slug: string): Promise<Carousel> {
        const carousel = await this.carouselsService.findBySlug(slug);
        if (!carousel.isActive) throw new NotFoundException('Không tìm thấy carousel');
        return carousel;
    }
}
