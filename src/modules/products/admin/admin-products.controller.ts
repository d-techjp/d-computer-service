import {
    applyDecorators,
    Body,
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
import { ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { LogActivity } from '../../../common/decorators/activity-log.decorator';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import { PermissionCode } from '../../../common/enums/permission.enum';
import { ActivityAction } from '../../activity-logs/enums/activity-action.enum';
import { MAX_IMAGES_PER_REQUEST } from '../../uploads/constants/upload.constants';
import { buildImageMulterOptions } from '../../uploads/multer-options';
import { ProductOptionsService } from '../application/product-options.service';
import { ProductVariantsService } from '../application/product-variants.service';
import type { ProductDescriptionView, ProductImageFiles } from '../application/products.service';
import { ProductsService } from '../application/products.service';
import { BulkUpdateVariantsDto } from '../dto/bulk-update-variants.dto';
import { CreateProductDto } from '../dto/create-product.dto';
import { CreateVariantDto } from '../dto/create-variant.dto';
import { QueryProductDto } from '../dto/query-product.dto';
import { GenerateVariantsDto, SetProductOptionsDto } from '../dto/set-product-options.dto';
import { UpdateProductDescriptionDto } from '../dto/update-product-description.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductOption } from '../entities/product-option.entity';
import { ProductVariant } from '../entities/product-variant.entity';
import { Product } from '../entities/product.entity';
import { AdminCostPriceService } from './admin-cost-price.service';
import { AdminVariantCountService } from './admin-variant-count.service';

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

@AdminController('products', 'Products')
@RequirePermissions(PermissionCode.PRODUCT_MANAGE)
export class AdminProductsController {
    constructor(
        private readonly productsService: ProductsService,
        private readonly variantsService: ProductVariantsService,
        private readonly optionsService: ProductOptionsService,
        private readonly costPriceService: AdminCostPriceService,
        private readonly variantCountService: AdminVariantCountService,
    ) {}

    @Get()
    @ApiOperation({
        summary: 'Danh sách sản phẩm mọi trạng thái: tìm kiếm, lọc, phân trang',
        description:
            'Khác bản storefront ở ba điểm: lọc được `status` (kể cả draft/archived), ' +
            'biến thể trả kèm `costPrice`, và mỗi sản phẩm có thêm `variantCount`.',
    })
    async findAll(@Query() query: QueryProductDto): Promise<PaginatedResult<Product>> {
        const page = await this.productsService.findAll(query);
        await this.variantCountService.attachToPage(page);
        return this.costPriceService.attachToPage(page);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Chi tiết sản phẩm theo id, kèm variants (có `costPrice`) + options' })
    async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Product> {
        return this.costPriceService.attachToProduct(await this.productsService.findOne(id));
    }

    @Get(':id/description')
    @ApiOperation({ summary: 'Mô tả chi tiết sản phẩm dạng HTML' })
    getDescription(@Param('id', ParseUUIDPipe) id: string): Promise<ProductDescriptionView> {
        return this.productsService.getDescription(id);
    }

    @Put(':id/description')
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

    @Post()
    @LogActivity({ action: ActivityAction.CREATE, resource: 'product' })
    @UploadProductImages()
    @ApiOperation({
        summary: 'Tạo sản phẩm (master + ít nhất 1 biến thể)',
        description:
            'Bắt buộc gửi `variants` với tối thiểu 1 phần tử — sản phẩm không có biến thể là hàng ' +
            'không bán được. Qua multipart thì `variants` là chuỗi JSON của mảng. ' +
            'thumbnail/images nhận URL có sẵn; gửi kèm thumbnailFile/imagesFiles để upload thẳng lên R2.',
    })
    async create(
        @Body() dto: CreateProductDto,
        @UploadedFiles() files?: UploadedProductFiles,
    ): Promise<Product> {
        return this.costPriceService.attachToProduct(
            await this.productsService.create(dto, this.toImageFiles(files)),
        );
    }

    @Patch(':id')
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'product' })
    @UploadProductImages()
    @ApiOperation({
        summary: 'Cập nhật thông tin master của sản phẩm',
        description:
            'Không đụng tới biến thể — dùng /admin/products/:productId/variants và /admin/variants/:id. ' +
            'Không gửi thumbnail/thumbnailFile/images/imagesFiles thì giữ nguyên ảnh hiện có.',
    })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateProductDto,
        @UploadedFiles() files?: UploadedProductFiles,
    ): Promise<Product> {
        return this.costPriceService.attachToProduct(
            await this.productsService.update(id, dto, this.toImageFiles(files)),
        );
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @LogActivity({ action: ActivityAction.DELETE, resource: 'product' })
    @ApiOperation({ summary: 'Xoá mềm sản phẩm (kéo theo toàn bộ biến thể)' })
    remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.productsService.remove(id);
    }

    // ── Biến thể thuộc một sản phẩm ────────────────────────────────────────

    @Get(':id/variants')
    @ApiOperation({ summary: 'Danh sách biến thể của sản phẩm, kèm `costPrice`' })
    async findVariants(@Param('id', ParseUUIDPipe) id: string): Promise<ProductVariant[]> {
        return this.costPriceService.attach(await this.variantsService.findByProduct(id));
    }

    @Post(':id/variants')
    @LogActivity({ action: ActivityAction.CREATE, resource: 'product_variant' })
    @ApiOperation({
        summary: 'Thêm một biến thể vào sản phẩm',
        description:
            'Sản phẩm đã khai option thì `optionValueIds` bắt buộc và phải phủ đúng 1 giá trị cho mỗi option.',
    })
    async createVariant(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: CreateVariantDto,
    ): Promise<ProductVariant> {
        return this.costPriceService.attachToVariant(await this.variantsService.create(id, dto));
    }

    @Patch(':id/variants')
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'product_variant' })
    @ApiOperation({
        summary: 'Sửa hàng loạt biến thể của cùng một sản phẩm',
        description:
            'Mỗi phần tử `variants[]` cần `id` + các field muốn đổi (giá, kho, `position`…). ' +
            'Không nhận file ảnh — ảnh riêng của từng biến thể vẫn qua PATCH /admin/variants/:id. ' +
            'Trả về TOÀN BỘ biến thể của sản phẩm sau khi sửa.',
    })
    async bulkUpdateVariants(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: BulkUpdateVariantsDto,
    ): Promise<ProductVariant[]> {
        return this.costPriceService.attach(
            await this.variantsService.bulkUpdate(id, dto.variants),
        );
    }

    @Post(':id/variants/generate')
    @LogActivity({ action: ActivityAction.CREATE, resource: 'product_variant' })
    @ApiOperation({
        summary: 'Sinh biến thể cho mọi tổ hợp option chưa có',
        description:
            'Tổ hợp đã tồn tại được bỏ qua nên gọi lại nhiều lần vẫn an toàn. ' +
            'Trả về TOÀN BỘ biến thể của sản phẩm sau khi sinh.',
    })
    async generateVariants(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: GenerateVariantsDto,
    ): Promise<ProductVariant[]> {
        return this.costPriceService.attach(
            await this.variantsService.generateFromOptions(id, dto),
        );
    }

    // ── Option (trục biến thể) ─────────────────────────────────────────────

    @Get(':id/options')
    @ApiOperation({ summary: 'Các trục biến thể của sản phẩm và giá trị hợp lệ' })
    findOptions(@Param('id', ParseUUIDPipe) id: string): Promise<ProductOption[]> {
        return this.optionsService.findByProduct(id);
    }

    @Put(':id/options')
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
