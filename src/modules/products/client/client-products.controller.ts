import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import { ProductOptionsService } from '../application/product-options.service';
import { ProductVariantsService } from '../application/product-variants.service';
import type { ProductDescriptionView } from '../application/products.service';
import { ProductOption } from '../entities/product-option.entity';
import { ProductVariant } from '../entities/product-variant.entity';
import { Product } from '../entities/product.entity';
import { ClientProductsService } from './client-products.service';
import { ClientQueryProductDto } from './dto/client-query-product.dto';

@ApiTags('Products')
@Public()
@Controller('products')
export class ClientProductsController {
    constructor(
        private readonly productsService: ClientProductsService,
        private readonly variantsService: ProductVariantsService,
        private readonly optionsService: ProductOptionsService,
    ) {}

    @Get()
    @ApiOperation({
        summary: 'Danh sách sản phẩm: tìm kiếm, lọc, phân trang',
        description:
            'Mỗi item trả kèm `minPrice`/`maxPrice`/`totalStock` và mảng `variants` ' +
            'CHỈ chứa biến thể mặc định — đủ để hiển thị giá và "mua ngay" ngay ở trang danh sách.',
    })
    findAll(@Query() query: ClientQueryProductDto): Promise<PaginatedResult<Product>> {
        return this.productsService.findAll(query);
    }

    @Get('slug/:slug')
    @ApiOperation({
        summary: 'Chi tiết sản phẩm theo slug, tự tăng lượt xem',
        description: 'Trả kèm toàn bộ `variants` (có `optionValues`) và `options`.',
    })
    findBySlug(@Param('slug') slug: string): Promise<Product> {
        return this.productsService.findBySlug(slug);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Chi tiết sản phẩm theo id, kèm variants + options' })
    findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Product> {
        return this.productsService.findOne(id);
    }

    @Get(':id/description')
    @ApiOperation({ summary: 'Mô tả chi tiết sản phẩm dạng HTML' })
    getDescription(@Param('id', ParseUUIDPipe) id: string): Promise<ProductDescriptionView> {
        return this.productsService.getDescription(id);
    }

    @Get(':id/variants')
    @ApiOperation({ summary: 'Danh sách biến thể của sản phẩm' })
    async findVariants(@Param('id', ParseUUIDPipe) id: string): Promise<ProductVariant[]> {
        // Gác trước: biến thể của hàng nháp / đã archive không được lộ ra
        await this.productsService.assertVisible(id);
        return this.variantsService.findByProduct(id);
    }

    @Get(':id/options')
    @ApiOperation({ summary: 'Các trục biến thể của sản phẩm và giá trị hợp lệ' })
    async findOptions(@Param('id', ParseUUIDPipe) id: string): Promise<ProductOption[]> {
        await this.productsService.assertVisible(id);
        return this.optionsService.findByProduct(id);
    }
}
