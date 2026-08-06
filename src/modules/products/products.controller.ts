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
    Put,
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
import { BulkUpdateVariantsDto } from './dto/bulk-update-variants.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { GenerateVariantsDto, SetProductOptionsDto } from './dto/set-product-options.dto';
import { UpdateProductDescriptionDto } from './dto/update-product-description.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductOption } from './entities/product-option.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { Product } from './entities/product.entity';
import { ProductOptionsService } from './product-options.service';
import { ProductVariantsService } from './product-variants.service';
import type { ProductDescriptionView, ProductImageFiles } from './products.service';
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
    constructor(
        private readonly productsService: ProductsService,
        private readonly variantsService: ProductVariantsService,
        private readonly optionsService: ProductOptionsService,
    ) {}

    @Public()
    @Get()
    @ApiOperation({
        summary: 'Danh sách sản phẩm: tìm kiếm, lọc, phân trang (public)',
        description:
            'Mỗi item trả kèm `minPrice`/`maxPrice`/`totalStock` và mảng `variants` ' +
            'CHỈ chứa biến thể mặc định — đủ để hiển thị giá và "mua ngay" ngay ở trang danh sách.',
    })
    findAll(@Query() query: QueryProductDto): Promise<PaginatedResult<Product>> {
        return this.productsService.findAll(query);
    }

    @Public()
    @Get('slug/:slug')
    @ApiOperation({
        summary: 'Chi tiết sản phẩm theo slug, tự tăng lượt xem (public)',
        description: 'Trả kèm toàn bộ `variants` (có `optionValues`) và `options`.',
    })
    findBySlug(@Param('slug') slug: string): Promise<Product> {
        return this.productsService.findBySlug(slug);
    }

    @Public()
    @Get(':id')
    @ApiOperation({ summary: 'Chi tiết sản phẩm theo id, kèm variants + options (public)' })
    findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Product> {
        return this.productsService.findOne(id);
    }

    @Public()
    @Get(':id/description')
    @ApiOperation({ summary: 'Mô tả chi tiết sản phẩm dạng HTML (public)' })
    getDescription(@Param('id', ParseUUIDPipe) id: string): Promise<ProductDescriptionView> {
        return this.productsService.getDescription(id);
    }

    @ApiBearerAuth()
    @Put(':id/description')
    @RequirePermissions(PermissionCode.PRODUCT_MANAGE)
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'product_description' })
    @ApiOperation({
        summary: 'Cập nhật mô tả chi tiết sản phẩm (HTML, soạn bằng rich text editor)',
    })
    updateDescription(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateProductDescriptionDto,
    ): Promise<ProductDescriptionView> {
        return this.productsService.updateDescription(id, dto.content);
    }

    @ApiBearerAuth()
    @Post()
    @RequirePermissions(PermissionCode.PRODUCT_MANAGE)
    @LogActivity({ action: ActivityAction.CREATE, resource: 'product' })
    @UploadProductImages()
    @ApiOperation({
        summary: 'Tạo sản phẩm (master + ít nhất 1 biến thể)',
        description:
            'Bắt buộc gửi `variants` với tối thiểu 1 phần tử — sản phẩm không có biến thể là hàng ' +
            'không bán được. Qua multipart thì `variants` là chuỗi JSON của mảng. ' +
            'thumbnail/images nhận URL có sẵn; gửi kèm thumbnailFile/imagesFiles để upload thẳng lên R2.',
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
        summary: 'Cập nhật thông tin master của sản phẩm',
        description:
            'Không đụng tới biến thể — dùng /products/:productId/variants và /variants/:id. ' +
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
    @Delete(':id')
    @RequirePermissions(PermissionCode.PRODUCT_MANAGE)
    @HttpCode(HttpStatus.NO_CONTENT)
    @LogActivity({ action: ActivityAction.DELETE, resource: 'product' })
    @ApiOperation({ summary: 'Xoá mềm sản phẩm (kéo theo toàn bộ biến thể)' })
    remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.productsService.remove(id);
    }

    // ── Biến thể thuộc một sản phẩm ────────────────────────────────────────

    @Public()
    @Get(':id/variants')
    @ApiOperation({ summary: 'Danh sách biến thể của sản phẩm (public)' })
    findVariants(@Param('id', ParseUUIDPipe) id: string): Promise<ProductVariant[]> {
        return this.variantsService.findByProduct(id);
    }

    @ApiBearerAuth()
    @Post(':id/variants')
    @RequirePermissions(PermissionCode.PRODUCT_MANAGE)
    @LogActivity({ action: ActivityAction.CREATE, resource: 'product_variant' })
    @ApiOperation({
        summary: 'Thêm một biến thể vào sản phẩm',
        description:
            'Sản phẩm đã khai option thì `optionValueIds` bắt buộc và phải phủ đúng 1 giá trị cho mỗi option.',
    })
    createVariant(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: CreateVariantDto,
    ): Promise<ProductVariant> {
        return this.variantsService.create(id, dto);
    }

    @ApiBearerAuth()
    @Patch(':id/variants')
    @RequirePermissions(PermissionCode.PRODUCT_MANAGE)
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'product_variant' })
    @ApiOperation({
        summary: 'Sửa hàng loạt biến thể của cùng một sản phẩm',
        description:
            'Mỗi phần tử `variants[]` cần `id` + các field muốn đổi (giá, kho, `position`…). ' +
            'Không nhận file ảnh — ảnh riêng của từng biến thể vẫn qua PATCH /variants/:id. ' +
            'Trả về TOÀN BỘ biến thể của sản phẩm sau khi sửa.',
    })
    bulkUpdateVariants(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: BulkUpdateVariantsDto,
    ): Promise<ProductVariant[]> {
        return this.variantsService.bulkUpdate(id, dto.variants);
    }

    @ApiBearerAuth()
    @Post(':id/variants/generate')
    @RequirePermissions(PermissionCode.PRODUCT_MANAGE)
    @LogActivity({ action: ActivityAction.CREATE, resource: 'product_variant' })
    @ApiOperation({
        summary: 'Sinh biến thể cho mọi tổ hợp option chưa có',
        description:
            'Tổ hợp đã tồn tại được bỏ qua nên gọi lại nhiều lần vẫn an toàn. ' +
            'Trả về TOÀN BỘ biến thể của sản phẩm sau khi sinh.',
    })
    generateVariants(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: GenerateVariantsDto,
    ): Promise<ProductVariant[]> {
        return this.variantsService.generateFromOptions(id, dto);
    }

    // ── Option (trục biến thể) ─────────────────────────────────────────────

    @Public()
    @Get(':id/options')
    @ApiOperation({ summary: 'Các trục biến thể của sản phẩm và giá trị hợp lệ (public)' })
    findOptions(@Param('id', ParseUUIDPipe) id: string): Promise<ProductOption[]> {
        return this.optionsService.findByProduct(id);
    }

    @ApiBearerAuth()
    @Put(':id/options')
    @RequirePermissions(PermissionCode.PRODUCT_MANAGE)
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'product_option' })
    @ApiOperation({
        summary: 'Thay thế toàn bộ option của sản phẩm',
        description:
            'Bị từ chối nếu payload bỏ mất một giá trị đang được biến thể sử dụng — ' +
            'xoá các biến thể đó trước.',
    })
    setOptions(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: SetProductOptionsDto,
    ): Promise<ProductOption[]> {
        return this.optionsService.replace(id, dto);
    }

    /** `FileFieldsInterceptor` trả `{ field: File[] }` — rút gọn về hình dạng service cần. */
    private toImageFiles(files?: UploadedProductFiles): ProductImageFiles {
        return {
            thumbnailFile: files?.thumbnailFile?.[0],
            imagesFiles: files?.imagesFiles,
        };
    }
}
