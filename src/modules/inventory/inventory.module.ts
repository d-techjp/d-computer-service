import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { AdminInventoryStockController } from './admin-inventory-stock.controller';
import { AdminInventoryTransactionsController } from './admin-inventory-transactions.controller';
import { InventoryService } from './application/inventory.service';
import { InventoryRepository } from './domain/inventory.repository';
import { InventoryTransaction } from './entities/inventory-transaction.entity';
import { TypeOrmInventoryRepository } from './infrastructure/typeorm-inventory.repository';

@Module({
    // ProductVariant được forFeature lại ở đây (đã forFeature ở ProductsModule)
    // thay vì import ProductsModule — tránh vòng lặp module với chiều
    // `products -> inventory` (ProductVariantsService.adjustStock ghi sổ qua đây).
    imports: [TypeOrmModule.forFeature([InventoryTransaction, ProductVariant])],
    controllers: [AdminInventoryStockController, AdminInventoryTransactionsController],
    providers: [
        InventoryService,
        { provide: InventoryRepository, useClass: TypeOrmInventoryRepository },
    ],
    exports: [InventoryService],
})
export class InventoryModule {}
