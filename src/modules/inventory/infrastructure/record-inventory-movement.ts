import type { EntityManager } from 'typeorm';
import type { RecordMovementInput } from '../domain/inventory.repository';
import { InventoryTransaction } from '../entities/inventory-transaction.entity';

/**
 * Ghi một dòng sổ nhập-xuất kho. Tách khỏi repository (nhận thẳng `manager`
 * thay vì tự mở transaction) vì `orders` cần gọi hàm này TRONG transaction
 * trừ/hoàn kho của chính nó — giống hệt cách `refreshProductAggregates`
 * (`src/modules/products/infrastructure/product-aggregates.ts`) được `orders`
 * tái sử dụng. Không cần `InventoryModule` khai báo trong `imports` của
 * `OrdersModule`: `manager.save()` chỉ cần entity đã được TypeORM DataSource
 * biết tới (đăng ký qua `TypeOrmModule.forFeature` ở `InventoryModule`).
 */
export const recordInventoryMovement = (
    manager: EntityManager,
    data: RecordMovementInput,
): Promise<InventoryTransaction> =>
    manager.save(InventoryTransaction, manager.create(InventoryTransaction, data));
