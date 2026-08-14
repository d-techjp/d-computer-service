import { BadRequestException, Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import {
    BundleInventoryPolicy,
    ProductVariant,
} from '../../products/entities/product-variant.entity';
import {
    InventoryRepository,
    type RecordMovementInput,
    type VariantStockRow,
} from '../domain/inventory.repository';
import type { CreateInventoryExportDto } from '../dto/create-inventory-export.dto';
import type { CreateInventoryImportDto } from '../dto/create-inventory-import.dto';
import type { QueryInventoryStockDto } from '../dto/query-inventory-stock.dto';
import type { QueryInventoryTransactionDto } from '../dto/query-inventory-transaction.dto';
import { InventoryTransaction } from '../entities/inventory-transaction.entity';
import { InventoryReferenceType, InventoryTransactionType } from '../enums/inventory.enum';

@Injectable()
export class InventoryService {
    constructor(private readonly inventoryRepository: InventoryRepository) {}

    async getStockOverview(
        query: QueryInventoryStockDto,
    ): Promise<PaginatedResult<VariantStockRow>> {
        const page = await this.inventoryRepository.searchStock(query);
        return new PaginatedResult(page.items, page.total, query.page, query.limit);
    }

    async getTransactions(
        query: QueryInventoryTransactionDto,
    ): Promise<PaginatedResult<InventoryTransaction>> {
        const page = await this.inventoryRepository.searchTransactions(query);
        return new PaginatedResult(page.items, page.total, query.page, query.limit);
    }

    /** Nhập kho thủ công (hàng mới, khách trả hàng, điều chỉnh sau kiểm kê...). */
    importStock(
        dto: CreateInventoryImportDto,
        performedById: string,
    ): Promise<InventoryTransaction> {
        return this.inventoryRepository.runTransaction(async (uow) => {
            const variant = await uow.lockVariant(dto.variantId);
            this.assertAdjustable(variant);

            const stockBefore = variant.stock;
            variant.stock += dto.quantity;
            await uow.saveVariant(variant);

            const transaction = await uow.recordMovement({
                variantId: variant.id,
                type: InventoryTransactionType.IN,
                reasonCode: dto.reasonCode,
                quantity: dto.quantity,
                stockBefore,
                stockAfter: variant.stock,
                referenceType: InventoryReferenceType.MANUAL,
                performedById,
                note: dto.note ?? null,
            });

            await uow.refreshProductAggregates(variant.productId);
            return transaction;
        });
    }

    /**
     * Xuất kho thủ công (hàng lỗi, thất thoát, điều chỉnh...). KHÔNG phải hàm
     * dùng khi bán hàng — `orders` tự khoá/trừ kho và ghi sổ trong transaction
     * đặt đơn của chính nó; hàm này dành cho luồng bán hàng khác ngoài `orders`
     * (nếu có sau này) hoặc xuất kho không gắn với đơn hàng nào.
     */
    exportStock(
        dto: CreateInventoryExportDto,
        performedById: string,
    ): Promise<InventoryTransaction> {
        return this.inventoryRepository.runTransaction(async (uow) => {
            const variant = await uow.lockVariant(dto.variantId);
            this.assertAdjustable(variant);

            if (variant.stock < dto.quantity) {
                throw new BadRequestException(
                    `Tồn kho không đủ: hiện có ${variant.stock}, yêu cầu xuất ${dto.quantity}`,
                );
            }

            const stockBefore = variant.stock;
            variant.stock -= dto.quantity;
            await uow.saveVariant(variant);

            const transaction = await uow.recordMovement({
                variantId: variant.id,
                type: InventoryTransactionType.OUT,
                reasonCode: dto.reasonCode,
                quantity: dto.quantity,
                stockBefore,
                stockAfter: variant.stock,
                referenceType: InventoryReferenceType.MANUAL,
                performedById,
                note: dto.note ?? null,
            });

            await uow.refreshProductAggregates(variant.productId);
            return transaction;
        });
    }

    /**
     * Ghi sổ cho một thao tác đã tự trừ/cộng kho ở nơi khác (vd
     * `ProductVariantsService.adjustStock`) — không khoá/mutate `stock`, chỉ ghi
     * thêm một dòng. Gọi *sau khi* nơi đó đã lưu variant thành công.
     */
    recordManualMovement(data: RecordMovementInput): Promise<InventoryTransaction> {
        return this.inventoryRepository.recordStandalone(data);
    }

    private assertAdjustable(variant: ProductVariant): void {
        if (!variant.trackInventory) {
            throw new BadRequestException(
                `Biến thể "${variant.sku}" không theo dõi tồn kho (trackInventory = false)`,
            );
        }
        if (variant.bundleInventoryPolicy === BundleInventoryPolicy.DERIVED_FROM_COMPONENTS) {
            throw new BadRequestException(
                'Tồn kho combo derived_from_components suy ra từ thành phần — ' +
                    'điều chỉnh kho của thành phần thay vì combo',
            );
        }
    }
}
