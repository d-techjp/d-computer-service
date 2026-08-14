import { Body, Get, Post, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { LogActivity } from '../../common/decorators/activity-log.decorator';
import { AdminController } from '../../common/decorators/admin-controller.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PaginatedResult } from '../../common/dto/paginated-result.dto';
import { PermissionCode } from '../../common/enums/permission.enum';
import { ActivityAction } from '../activity-logs/enums/activity-action.enum';
import { InventoryService } from './application/inventory.service';
import { CreateInventoryExportDto } from './dto/create-inventory-export.dto';
import { CreateInventoryImportDto } from './dto/create-inventory-import.dto';
import { QueryInventoryTransactionDto } from './dto/query-inventory-transaction.dto';
import { InventoryTransaction } from './entities/inventory-transaction.entity';

@AdminController('inventory/transactions', 'Inventory Transactions')
@RequirePermissions(PermissionCode.INVENTORY_MANAGE)
export class AdminInventoryTransactionsController {
    constructor(private readonly inventoryService: InventoryService) {}

    @Get()
    @ApiOperation({
        summary: 'Sổ nhập-xuất kho',
        description:
            'Lọc theo variant, loại (in/out), lý do, nguồn gốc (order/manual), người thực hiện, ' +
            'khoảng thời gian.',
    })
    findAll(
        @Query() query: QueryInventoryTransactionDto,
    ): Promise<PaginatedResult<InventoryTransaction>> {
        return this.inventoryService.getTransactions(query);
    }

    @Post('import')
    @LogActivity({ action: ActivityAction.CREATE, resource: 'inventory_import' })
    @ApiOperation({ summary: 'Nhập kho thủ công (hàng mới, khách trả hàng, kiểm kê...)' })
    import(
        @Body() dto: CreateInventoryImportDto,
        @CurrentUser('id') performedById: string,
    ): Promise<InventoryTransaction> {
        return this.inventoryService.importStock(dto, performedById);
    }

    @Post('export')
    @LogActivity({ action: ActivityAction.CREATE, resource: 'inventory_export' })
    @ApiOperation({
        summary: 'Xuất kho thủ công (hàng lỗi, thất thoát, kiểm kê...)',
        description: 'Không dùng cho bán hàng — đơn hàng tự trừ/ghi sổ kho khi tạo đơn.',
    })
    export(
        @Body() dto: CreateInventoryExportDto,
        @CurrentUser('id') performedById: string,
    ): Promise<InventoryTransaction> {
        return this.inventoryService.exportStock(dto, performedById);
    }
}
