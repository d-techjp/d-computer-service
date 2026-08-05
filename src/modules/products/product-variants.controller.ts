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
    Put,
    UploadedFiles,
    UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LogActivity } from '../../common/decorators/activity-log.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PermissionCode } from '../../common/enums/permission.enum';
import { ActivityAction } from '../activity-logs/enums/activity-action.enum';
import { MAX_IMAGES_PER_REQUEST } from '../uploads/constants/upload.constants';
import { buildImageMulterOptions } from '../uploads/multer-options';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { SetBundleItemsDto } from './dto/set-bundle-items.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { ProductBundleItem } from './entities/product-bundle-item.entity';
import { ProductVariant } from './entities/product-variant.entity';
import type { BundleAvailability } from './product-bundles.service';
import { ProductBundlesService } from './product-bundles.service';
import type { VariantImageFiles } from './product-variants.service';
import { ProductVariantsService } from './product-variants.service';

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
 * Thao tác trên một biến thể cụ thể. Tách khỏi `/products` để không phải mang
 * theo `productId` (biến thể đã biết sản phẩm cha của nó) và để tránh mọi mập
 * mờ khi khớp route với `/products/:id/...`.
 */
@ApiTags('Product Variants')
@Controller('variants')
export class ProductVariantsController {
    constructor(
        private readonly variantsService: ProductVariantsService,
        private readonly bundlesService: ProductBundlesService,
    ) {}

    @ApiBearerAuth()
    @Get('low-stock')
    @RequirePermissions(PermissionCode.INVENTORY_MANAGE)
    @ApiOperation({ summary: 'Biến thể dưới ngưỡng cảnh báo tồn kho' })
    findLowStock(): Promise<ProductVariant[]> {
        return this.variantsService.findLowStock();
    }

    @Public()
    @Get(':id')
    @ApiOperation({ summary: 'Chi tiết một biến thể, kèm tổ hợp option (public)' })
    findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ProductVariant> {
        return this.variantsService.findOne(id);
    }

    @ApiBearerAuth()
    @Patch(':id')
    @RequirePermissions(PermissionCode.PRODUCT_MANAGE)
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'product_variant' })
    @UploadVariantImages()
    @ApiOperation({
        summary: 'Cập nhật biến thể (giá, SKU, ảnh riêng, bật/tắt)',
        description:
            'Không đổi được tổ hợp option của biến thể đã tồn tại — xoá rồi tạo lại nếu cần. ' +
            'Không đặt được `stock` cho combo derived_from_components.',
    })
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateVariantDto,
        @UploadedFiles() files?: UploadedVariantFiles,
    ): Promise<ProductVariant> {
        return this.variantsService.update(id, dto, this.toImageFiles(files));
    }

    @ApiBearerAuth()
    @Patch(':id/stock')
    @RequirePermissions(PermissionCode.INVENTORY_MANAGE)
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'product_variant_stock' })
    @ApiOperation({
        summary: 'Điều chỉnh tồn kho của biến thể (nhập hàng / kiểm kê)',
        description:
            'Từ chối với combo derived_from_components — điều chỉnh kho của thành phần thay vào đó.',
    })
    adjustStock(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: AdjustStockDto,
    ): Promise<ProductVariant> {
        return this.variantsService.adjustStock(id, dto.delta, dto.reason);
    }

    @ApiBearerAuth()
    @Delete(':id')
    @RequirePermissions(PermissionCode.PRODUCT_MANAGE)
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

    @Public()
    @Get(':id/bundle-items')
    @ApiOperation({ summary: 'Danh sách thành phần của một combo (public)' })
    findBundleItems(@Param('id', ParseUUIDPipe) id: string): Promise<ProductBundleItem[]> {
        return this.bundlesService.findItems(id);
    }

    @ApiBearerAuth()
    @Put(':id/bundle-items')
    @RequirePermissions(PermissionCode.PRODUCT_MANAGE)
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

    @Public()
    @Get(':id/availability')
    @ApiOperation({
        summary: 'Số combo còn bán được, tính từ tồn kho thành phần (public)',
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
