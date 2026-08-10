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
    Put,
    UploadedFiles,
    UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { LogActivity } from '../../../common/decorators/activity-log.decorator';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { PermissionCode } from '../../../common/enums/permission.enum';
import { ActivityAction } from '../../activity-logs/enums/activity-action.enum';
import { MAX_IMAGES_PER_REQUEST } from '../../uploads/constants/upload.constants';
import { buildImageMulterOptions } from '../../uploads/multer-options';
import type { BundleAvailability } from '../application/product-bundles.service';
import { ProductBundlesService } from '../application/product-bundles.service';
import type { VariantImageFiles } from '../application/product-variants.service';
import { ProductVariantsService } from '../application/product-variants.service';
import { AdjustStockDto } from '../dto/adjust-stock.dto';
import { SetBundleItemsDto } from '../dto/set-bundle-items.dto';
import { UpdateVariantDto } from '../dto/update-variant.dto';
import { ProductBundleItem } from '../entities/product-bundle-item.entity';
import { ProductVariant } from '../entities/product-variant.entity';
import { AdminCostPriceService } from './admin-cost-price.service';

type UploadedVariantFiles = Partial<Record<'thumbnailFile' | 'imagesFiles', Express.Multer.File[]>>;

const UploadVariantImages = (): MethodDecorator =>
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

/**
 * Thao tác quản trị trên một biến thể cụ thể. Tách khỏi `/admin/products` để
 * không phải mang theo `productId` (biến thể đã biết sản phẩm cha của nó).
 *
 * Quyền mặc định là `PRODUCT_MANAGE`; hai endpoint kho tự khai `INVENTORY_MANAGE`
 * đè lên (metadata ở handler thắng metadata ở class).
 */
@AdminController('variants', 'Product Variants')
@RequirePermissions(PermissionCode.PRODUCT_MANAGE)
export class AdminVariantsController {
    constructor(
        private readonly variantsService: ProductVariantsService,
        private readonly bundlesService: ProductBundlesService,
        private readonly costPriceService: AdminCostPriceService,
    ) {}

    @Get('low-stock')
    @RequirePermissions(PermissionCode.INVENTORY_MANAGE)
    @ApiOperation({ summary: 'Biến thể dưới ngưỡng cảnh báo tồn kho, kèm `costPrice`' })
    async findLowStock(): Promise<ProductVariant[]> {
        return this.costPriceService.attach(await this.variantsService.findLowStock());
    }

    @Get(':id')
    @ApiOperation({ summary: 'Chi tiết một biến thể, kèm tổ hợp option và `costPrice`' })
    async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ProductVariant> {
        return this.costPriceService.attachToVariant(await this.variantsService.findOne(id));
    }

    @Patch(':id')
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'product_variant' })
    @UploadVariantImages()
    @ApiOperation({
        summary: 'Cập nhật biến thể (giá, SKU, ảnh riêng, bật/tắt)',
        description:
            'Không đổi được tổ hợp option của biến thể đã tồn tại — xoá rồi tạo lại nếu cần. ' +
            'Không đặt được `stock` cho combo derived_from_components.',
    })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateVariantDto,
        @UploadedFiles() files?: UploadedVariantFiles,
    ): Promise<ProductVariant> {
        return this.costPriceService.attachToVariant(
            await this.variantsService.update(id, dto, this.toImageFiles(files)),
        );
    }

    @Patch(':id/stock')
    @RequirePermissions(PermissionCode.INVENTORY_MANAGE)
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'product_variant_stock' })
    @ApiOperation({
        summary: 'Điều chỉnh tồn kho của biến thể (nhập hàng / kiểm kê)',
        description:
            'Từ chối với combo derived_from_components — điều chỉnh kho của thành phần thay vào đó.',
    })
    async adjustStock(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: AdjustStockDto,
    ): Promise<ProductVariant> {
        return this.costPriceService.attachToVariant(
            await this.variantsService.adjustStock(id, dto.delta, dto.reason),
        );
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @LogActivity({ action: ActivityAction.DELETE, resource: 'product_variant' })
    @ApiOperation({
        summary: 'Xoá mềm biến thể',
        description:
            'Từ chối nếu là biến thể cuối cùng của sản phẩm, hoặc đang là thành phần của một combo.',
    })
    remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.variantsService.remove(id);
    }

    // ── Combo ──────────────────────────────────────────────────────────────

    @Get(':id/bundle-items')
    @ApiOperation({ summary: 'Danh sách thành phần của một combo' })
    findBundleItems(@Param('id', ParseUUIDPipe) id: string): Promise<ProductBundleItem[]> {
        return this.bundlesService.findItems(id);
    }

    @Put(':id/bundle-items')
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'product_bundle_item' })
    @ApiOperation({
        summary: 'Thay thế toàn bộ thành phần của combo',
        description:
            'Chỉ áp dụng cho biến thể của sản phẩm productType = bundle. ' +
            'Thành phần phải là biến thể của sản phẩm standard (không cho combo lồng combo).',
    })
    setBundleItems(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: SetBundleItemsDto,
    ): Promise<ProductBundleItem[]> {
        return this.bundlesService.setItems(id, dto);
    }

    @Get(':id/availability')
    @ApiOperation({
        summary: 'Số combo còn bán được, tính từ tồn kho thành phần',
        description:
            'available = MIN(floor(stock thành phần / số lượng cần)) trên thành phần bắt buộc.',
    })
    availability(@Param('id', ParseUUIDPipe) id: string): Promise<BundleAvailability> {
        return this.bundlesService.resolveAvailability(id);
    }

    private toImageFiles(files?: UploadedVariantFiles): VariantImageFiles {
        return {
            thumbnailFile: files?.thumbnailFile?.[0],
            imagesFiles: files?.imagesFiles,
        };
    }
}
