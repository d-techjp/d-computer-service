import {
    Body,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { LogActivity } from '../../../common/decorators/activity-log.decorator';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import { PermissionCode } from '../../../common/enums/permission.enum';
import { ActivityAction } from '../../activity-logs/enums/activity-action.enum';
import type { Product } from '../../products/entities/product.entity';
import { CarouselProductsService } from '../application/carousel-products.service';
import { CarouselsService } from '../application/carousels.service';
import { CAROUSEL_FILTER_SCHEMA, type FilterFieldSchema } from '../domain/carousel-filter-schema';
import { CreateCarouselDto } from '../dto/create-carousel.dto';
import { PreviewCarouselDto } from '../dto/preview-carousel.dto';
import { QueryCarouselDto } from '../dto/query-carousel.dto';
import { ReorderCarouselsDto } from '../dto/reorder-carousels.dto';
import { UpdateCarouselDto } from '../dto/update-carousel.dto';
import { Carousel } from '../entities/carousel.entity';

@AdminController('carousels', 'Carousels')
@RequirePermissions(PermissionCode.PRODUCT_CAROUSEL_MANAGE)
export class AdminCarouselsController {
    constructor(
        private readonly carouselsService: CarouselsService,
        private readonly carouselProductsService: CarouselProductsService,
    ) {}

    @Get()
    @ApiOperation({
        summary: 'Danh sách carousel, gồm cả carousel đã tắt',
        description: '`withProductCount=true` để kèm số sản phẩm khớp bộ lọc của từng dòng.',
    })
    async findAll(@Query() query: QueryCarouselDto): Promise<PaginatedResult<Carousel>> {
        const page = await this.carouselsService.findAll(query);
        if (!query.withProductCount) {
            // `null` tường minh, không phải thiếu field: FE phân biệt được "chưa tính" với "đếm ra 0"
            page.items.forEach((carousel) => (carousel.productCount = null));
            return page;
        }

        // Mỗi carousel một truy vấn đếm -> chỉ chạy khi admin xin, và chạy song song
        await Promise.all(
            page.items.map(async (carousel) => {
                carousel.productCount = await this.carouselProductsService.countProducts(
                    carousel.filters,
                );
            }),
        );
        return page;
    }

    // Ba route đường dẫn cố định phải đứng TRƯỚC `:id`, không thì ParseUUIDPipe nuốt mất
    @Get('filter-schema')
    @ApiOperation({
        summary: 'Các key được phép dùng trong filters',
        description: 'Để admin UI dựng form lọc động thay vì hard-code rồi lệch với BE.',
    })
    getFilterSchema(): FilterFieldSchema[] {
        return [...CAROUSEL_FILTER_SCHEMA];
    }

    @Post('preview')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Xem trước sản phẩm khớp một bộ lọc bất kỳ',
        description:
            'Nhận bộ lọc ĐANG SOẠN trong form nên không đọc từ carousel đã lưu. ' +
            'Áp cùng rào trạng thái như storefront -> đúng thứ khách sẽ thấy.',
    })
    preview(@Body() dto: PreviewCarouselDto): Promise<PaginatedResult<Product>> {
        return this.carouselProductsService.listProducts(dto.filters, {
            page: dto.page,
            limit: dto.limit,
        });
    }

    @Post('reorder')
    @HttpCode(HttpStatus.NO_CONTENT)
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'carousel' })
    @ApiOperation({ summary: 'Sắp xếp lại thứ tự hiển thị' })
    reorder(@Body() dto: ReorderCarouselsDto): Promise<void> {
        return this.carouselsService.reorder(dto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Chi tiết carousel theo id' })
    findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Carousel> {
        return this.carouselsService.findOne(id);
    }

    @Post()
    @LogActivity({ action: ActivityAction.CREATE, resource: 'carousel' })
    @ApiOperation({
        summary: 'Tạo carousel',
        description: 'BE sinh `filterQuery` từ `filters` và trả về cả hai.',
    })
    create(@Body() dto: CreateCarouselDto): Promise<Carousel> {
        return this.carouselsService.create(dto);
    }

    @Patch(':id')
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'carousel' })
    @ApiOperation({
        summary: 'Cập nhật carousel',
        description: '`filters` thay nguyên cụm, không merge từng key. Gửi `{}` để xoá bộ lọc.',
    })
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateCarouselDto,
    ): Promise<Carousel> {
        return this.carouselsService.update(id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @LogActivity({ action: ActivityAction.DELETE, resource: 'carousel' })
    @ApiOperation({ summary: 'Xoá mềm carousel' })
    remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.carouselsService.remove(id);
    }
}
