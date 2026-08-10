import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import type { BundleAvailability } from '../application/product-bundles.service';
import { ProductBundleItem } from '../entities/product-bundle-item.entity';
import { ProductVariant } from '../entities/product-variant.entity';
import { ClientVariantsService } from './client-variants.service';

/**
 * Thao tác trên một biến thể cụ thể. Tách khỏi `/products` để không phải mang
 * theo `productId` (biến thể đã biết sản phẩm cha của nó) và để tránh mọi mập
 * mờ khi khớp route với `/products/:id/...`.
 */
@ApiTags('Product Variants')
@Public()
@Controller('variants')
export class ClientVariantsController {
    constructor(private readonly variantsService: ClientVariantsService) {}

    @Get(':id')
    @ApiOperation({ summary: 'Chi tiết một biến thể, kèm tổ hợp option' })
    findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ProductVariant> {
        return this.variantsService.findOne(id);
    }

    @Get(':id/bundle-items')
    @ApiOperation({ summary: 'Danh sách thành phần của một combo' })
    findBundleItems(@Param('id', ParseUUIDPipe) id: string): Promise<ProductBundleItem[]> {
        return this.variantsService.findBundleItems(id);
    }

    @Get(':id/availability')
    @ApiOperation({
        summary: 'Số combo còn bán được, tính từ tồn kho thành phần',
        description:
            'available = MIN(floor(stock thành phần / số lượng cần)) trên thành phần bắt buộc.',
    })
    availability(@Param('id', ParseUUIDPipe) id: string): Promise<BundleAvailability> {
        return this.variantsService.resolveAvailability(id);
    }
}
