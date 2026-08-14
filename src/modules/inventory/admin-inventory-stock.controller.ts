import { Get, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { AdminController } from '../../common/decorators/admin-controller.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PaginatedResult } from '../../common/dto/paginated-result.dto';
import { PermissionCode } from '../../common/enums/permission.enum';
import { InventoryService } from './application/inventory.service';
import type { VariantStockRow } from './domain/inventory.repository';
import { QueryInventoryStockDto } from './dto/query-inventory-stock.dto';

/** Không có mặt storefront nào dùng inventory nên không tách client/admin — xem `RbacModule`. */
@AdminController('inventory/stock', 'Inventory Stock')
@RequirePermissions(PermissionCode.INVENTORY_MANAGE)
export class AdminInventoryStockController {
    constructor(private readonly inventoryService: InventoryService) {}

    @Get()
    @ApiOperation({
        summary: 'Tồn kho theo biến thể',
        description:
            'Tìm theo tên sản phẩm/SKU/tên biến thể qua `search`; lọc theo khoảng tồn kho qua ' +
            '`minStock`/`maxStock`. Mỗi dòng gồm tồn hiện tại, ngưỡng cảnh báo, tổng đã nhập và ' +
            'tổng đã bán từ trước tới nay.',
    })
    findAll(@Query() query: QueryInventoryStockDto): Promise<PaginatedResult<VariantStockRow>> {
        return this.inventoryService.getStockOverview(query);
    }
}
