import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { ClientCarouselsService } from './client-carousels.service';
import { ClientCarouselProductsDto } from './dto/client-carousel-products.dto';
import { ClientQueryCarouselDto } from './dto/client-query-carousel.dto';
import type { CarouselProductsDto, PublicCarouselDto } from './dto/public-carousel.dto';

@ApiTags('Carousels')
@Public()
@Controller('carousels')
export class ClientCarouselsController {
    constructor(private readonly carouselsService: ClientCarouselsService) {}

    @Get()
    @ApiOperation({
        summary: 'Danh sách carousel đang bật, dùng dựng trang chủ',
        description:
            'Sắp theo `sortOrder` tăng dần. Không phân trang — số lượng carousel luôn nhỏ. ' +
            '`includeProducts=true` để mỗi carousel kèm sẵn `itemLimit` sản phẩm đầu tiên.',
    })
    findAll(@Query() query: ClientQueryCarouselDto): Promise<PublicCarouselDto[]> {
        return this.carouselsService.findAll(query);
    }

    @Get(':slug')
    @ApiOperation({
        summary: 'Chi tiết carousel theo slug — dùng cho header trang danh sách',
        description: 'Carousel đã tắt trả 404, giống như không tồn tại.',
    })
    findBySlug(@Param('slug') slug: string): Promise<PublicCarouselDto> {
        return this.carouselsService.findBySlug(slug);
    }

    @Get(':slug/products')
    @ApiOperation({
        summary: 'Sản phẩm của carousel — chỉ cần slug',
        description:
            'Bộ lọc và thứ tự đã nằm trong carousel nên request không nhận tham số lọc nào, ' +
            'ngoài phân trang. Trả kèm `carousel` (id, name, `filterQuery`) để FE dựng tiêu đề ' +
            'slide và link "Xem tất cả" sang `GET /products?<filterQuery>` mà không phải gọi ' +
            'thêm endpoint nào. `items` có khuôn dạng y hệt item của `GET /products`.',
    })
    findProducts(
        @Param('slug') slug: string,
        @Query() query: ClientCarouselProductsDto,
    ): Promise<CarouselProductsDto> {
        return this.carouselsService.findProducts(slug, query);
    }
}
