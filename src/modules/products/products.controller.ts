import {
    applyDecorators,
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
    UploadedFiles,
    UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LogActivity } from '../../common/decorators/activity-log.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PaginatedResult } from '../../common/dto/paginated-result.dto';
import { PermissionCode } from '../../common/enums/permission.enum';
import { ActivityAction } from '../activity-logs/enums/activity-action.enum';
import { MAX_IMAGES_PER_REQUEST } from '../uploads/constants/upload.constants';
import { buildImageMulterOptions } from '../uploads/multer-options';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import type { ProductImageFiles } from './products.service';
import { ProductsService } from './products.service';

/** Multer field cho `thumbnailFile`/`imagesFiles` + khai multipart cho Swagger — dùng chung create/update. */
const UploadProductImages = (): MethodDecorator =>
    applyDecorators(
        UseInterceptors(
            FileFieldsInterceptor(
                [
                    { name: 'thumbnailFile', maxCount: 1 },
                    { name: 'imagesFiles', maxCount: MAX_IMAGES_PER_REQUEST },
                ],
                buildImageMulterOptions(MAX_IMAGES_PER_REQUEST + 1),
            ),
        ),
        ApiConsumes('multipart/form-data'),
    );

type UploadedProductFiles = Partial<Record<'thumbnailFile' | 'imagesFiles', Express.Multer.File[]>>;

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
    @RequirePermissions(PermissionCode.INVENTORY_MANAGE)
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
    @RequirePermissions(PermissionCode.PRODUCT_MANAGE)
    @LogActivity({ action: ActivityAction.CREATE, resource: 'product' })
    @UploadProductImages()
    @ApiOperation({
        summary: 'Tạo sản phẩm',
        description:
            'thumbnail/images nhận URL có sẵn; gửi kèm thumbnailFile/imagesFiles (multipart) để upload thẳng lên R2 trong cùng request.',
    })
    create(
        @Body() dto: CreateProductDto,
        @UploadedFiles() files?: UploadedProductFiles,
    ): Promise<Product> {
        return this.productsService.create(dto, this.toImageFiles(files));
    }

    @ApiBearerAuth()
    @Patch(':id')
    @RequirePermissions(PermissionCode.PRODUCT_MANAGE)
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'product' })
    @UploadProductImages()
    @ApiOperation({
        summary: 'Cập nhật sản phẩm',
        description:
            'Không gửi thumbnail/thumbnailFile/images/imagesFiles thì giữ nguyên ảnh hiện có.',
    })
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateProductDto,
        @UploadedFiles() files?: UploadedProductFiles,
    ): Promise<Product> {
        return this.productsService.update(id, dto, this.toImageFiles(files));
    }

    @ApiBearerAuth()
    @Patch(':id/stock')
    @RequirePermissions(PermissionCode.INVENTORY_MANAGE)
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
    @RequirePermissions(PermissionCode.PRODUCT_MANAGE)
    @HttpCode(HttpStatus.NO_CONTENT)
    @LogActivity({ action: ActivityAction.DELETE, resource: 'product' })
    @ApiOperation({ summary: 'Xoá mềm sản phẩm' })
    remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.productsService.remove(id);
    }

    /** `FileFieldsInterceptor` trả `{ field: File[] }` — rút gọn về hình dạng service cần. */
    private toImageFiles(files?: UploadedProductFiles): ProductImageFiles {
        return {
            thumbnailFile: files?.thumbnailFile?.[0],
            imagesFiles: files?.imagesFiles,
        };
    }
}
