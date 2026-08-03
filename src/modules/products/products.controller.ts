import {
    Body,
    Controller,
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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LogActivity } from '../../common/decorators/activity-log.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedResult } from '../../common/dto/paginated-result.dto';
import { Role } from '../../common/enums/role.enum';
import { ActivityAction } from '../activity-logs/enums/activity-action.enum';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { ProductsService } from './products.service';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) {}

    @Public()
    @Get()
    @ApiOperation({ summary: 'Danh sách sản phẩm: tìm kiếm, lọc, phân trang (public)' })
    findAll(@Query() query: QueryProductDto): Promise<PaginatedResult<Product>> {
        return this.productsService.findAll(query);
    }

    @ApiBearerAuth()
    @Get('low-stock')
    @Roles(Role.ADMIN, Role.STAFF)
    @ApiOperation({ summary: 'Sản phẩm dưới ngưỡng cảnh báo tồn kho' })
    findLowStock(): Promise<Product[]> {
        return this.productsService.findLowStock();
    }

    @Public()
    @Get('slug/:slug')
    @ApiOperation({ summary: 'Chi tiết sản phẩm theo slug, tự tăng lượt xem (public)' })
    findBySlug(@Param('slug') slug: string): Promise<Product> {
        return this.productsService.findBySlug(slug);
    }

    @Public()
    @Get(':id')
    @ApiOperation({ summary: 'Chi tiết sản phẩm theo id (public)' })
    findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Product> {
        return this.productsService.findOne(id);
    }

    @ApiBearerAuth()
    @Post()
    @Roles(Role.ADMIN, Role.STAFF)
    @LogActivity({ action: ActivityAction.CREATE, resource: 'product' })
    @ApiOperation({ summary: 'Tạo sản phẩm' })
    create(@Body() dto: CreateProductDto): Promise<Product> {
        return this.productsService.create(dto);
    }

    @ApiBearerAuth()
    @Patch(':id')
    @Roles(Role.ADMIN, Role.STAFF)
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'product' })
    @ApiOperation({ summary: 'Cập nhật sản phẩm' })
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateProductDto,
    ): Promise<Product> {
        return this.productsService.update(id, dto);
    }

    @ApiBearerAuth()
    @Patch(':id/stock')
    @Roles(Role.ADMIN, Role.STAFF)
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'product_stock' })
    @ApiOperation({ summary: 'Điều chỉnh tồn kho (nhập hàng / kiểm kê)' })
    adjustStock(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: AdjustStockDto,
    ): Promise<Product> {
        return this.productsService.adjustStock(id, dto.delta, dto.reason);
    }

    @ApiBearerAuth()
    @Delete(':id')
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    @LogActivity({ action: ActivityAction.DELETE, resource: 'product' })
    @ApiOperation({ summary: 'Xoá mềm sản phẩm' })
    remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.productsService.remove(id);
    }
}
