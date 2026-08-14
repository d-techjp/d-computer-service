import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, type EntityManager, Repository } from 'typeorm';
import type { RepositoryPage } from '../../../common/interfaces/repository-page.interface';
import { resolveSortColumn } from '../../../common/utils/query.util';
import { refreshProductAggregates } from '../../products/infrastructure/product-aggregates';
import { ProductVariant } from '../../products/entities/product-variant.entity';
import {
    InventoryRepository,
    type InventoryUnitOfWork,
    type RecordMovementInput,
    type VariantStockRow,
} from '../domain/inventory.repository';
import type { QueryInventoryStockDto } from '../dto/query-inventory-stock.dto';
import type { QueryInventoryTransactionDto } from '../dto/query-inventory-transaction.dto';
import { InventoryTransaction } from '../entities/inventory-transaction.entity';
import { InventoryTransactionType } from '../enums/inventory.enum';
import { recordInventoryMovement } from './record-inventory-movement';

const STOCK_SORTABLE_COLUMNS = ['stock', 'lowStockThreshold', 'soldCount', 'sku'] as const;
const TRANSACTION_SORTABLE_COLUMNS = ['createdAt', 'quantity', 'type'] as const;

@Injectable()
export class TypeOrmInventoryRepository extends InventoryRepository {
    constructor(
        @InjectRepository(ProductVariant) private readonly variantRepo: Repository<ProductVariant>,
        @InjectRepository(InventoryTransaction)
        private readonly transactionRepo: Repository<InventoryTransaction>,
        @InjectDataSource() private readonly dataSource: DataSource,
    ) {
        super();
    }

    async searchStock(criteria: QueryInventoryStockDto): Promise<RepositoryPage<VariantStockRow>> {
        const qb = this.variantRepo
            .createQueryBuilder('variant')
            .innerJoin('variant.product', 'product')
            .addSelect(['product.id', 'product.name', 'product.thumbnail']);

        if (criteria.search) {
            qb.andWhere(
                '(product.name ILIKE :search OR variant.sku ILIKE :search OR variant.name ILIKE :search)',
                { search: `%${criteria.search}%` },
            );
        }
        if (criteria.minStock !== undefined) {
            qb.andWhere('variant.stock >= :minStock', { minStock: criteria.minStock });
        }
        if (criteria.maxStock !== undefined) {
            qb.andWhere('variant.stock <= :maxStock', { maxStock: criteria.maxStock });
        }

        const sortBy = resolveSortColumn(criteria.sortBy, STOCK_SORTABLE_COLUMNS, 'stock');
        qb.orderBy(`variant.${sortBy}`, criteria.sortOrder)
            .skip(criteria.skip)
            .take(criteria.limit);

        const [variants, total] = await qb.getManyAndCount();
        return { items: await this.attachStockRows(variants), total };
    }

    /**
     * Gắn `totalReceived` cho một trang variant bằng đúng MỘT truy vấn GROUP BY
     * trên `inventory_transactions`, thay vì hỏi riêng cho từng variant (n+1) —
     * cùng cách `CategoriesRepository.attachProductCounts` đã làm.
     */
    private async attachStockRows(variants: ProductVariant[]): Promise<VariantStockRow[]> {
        if (variants.length === 0) return [];

        const variantIds = variants.map((variant) => variant.id);
        const rows = await this.transactionRepo
            .createQueryBuilder('txn')
            .select('txn.variantId', 'variantId')
            .addSelect('SUM(txn.quantity)', 'total')
            .where('txn.variantId IN (:...variantIds)', { variantIds })
            .andWhere('txn.type = :type', { type: InventoryTransactionType.IN })
            .groupBy('txn.variantId')
            .getRawMany<{ variantId: string; total: string }>();
        const receivedByVariantId = new Map(rows.map((row) => [row.variantId, Number(row.total)]));

        return variants.map((variant) => ({
            variantId: variant.id,
            sku: variant.sku,
            variantName: variant.name,
            productId: variant.productId,
            productName: variant.product.name,
            thumbnail: variant.thumbnail ?? variant.product.thumbnail,
            stock: variant.stock,
            lowStockThreshold: variant.lowStockThreshold,
            isLowStock: variant.stock <= variant.lowStockThreshold,
            trackInventory: variant.trackInventory,
            totalReceived: receivedByVariantId.get(variant.id) ?? 0,
            totalSold: variant.soldCount,
        }));
    }

    async searchTransactions(
        criteria: QueryInventoryTransactionDto,
    ): Promise<RepositoryPage<InventoryTransaction>> {
        const qb = this.transactionRepo
            .createQueryBuilder('txn')
            .leftJoin('txn.variant', 'variant')
            .addSelect(['variant.id', 'variant.sku', 'variant.name'])
            .leftJoin('txn.performedBy', 'performedBy')
            .addSelect(['performedBy.id', 'performedBy.fullName', 'performedBy.username']);

        if (criteria.variantId) {
            qb.andWhere('txn.variantId = :variantId', { variantId: criteria.variantId });
        }
        if (criteria.search) {
            qb.andWhere('(variant.sku ILIKE :search OR variant.name ILIKE :search)', {
                search: `%${criteria.search}%`,
            });
        }
        if (criteria.type) qb.andWhere('txn.type = :type', { type: criteria.type });
        if (criteria.reasonCode) {
            qb.andWhere('txn.reasonCode = :reasonCode', { reasonCode: criteria.reasonCode });
        }
        if (criteria.referenceType) {
            qb.andWhere('txn.referenceType = :referenceType', {
                referenceType: criteria.referenceType,
            });
        }
        if (criteria.referenceId) {
            qb.andWhere('txn.referenceId = :referenceId', { referenceId: criteria.referenceId });
        }
        if (criteria.performedById) {
            qb.andWhere('txn.performedById = :performedById', {
                performedById: criteria.performedById,
            });
        }
        if (criteria.from) qb.andWhere('txn.createdAt >= :from', { from: criteria.from });
        if (criteria.to) qb.andWhere('txn.createdAt <= :to', { to: criteria.to });

        const sortBy = resolveSortColumn(
            criteria.sortBy,
            TRANSACTION_SORTABLE_COLUMNS,
            'createdAt',
        );
        qb.orderBy(`txn.${sortBy}`, criteria.sortOrder).skip(criteria.skip).take(criteria.limit);

        const [items, total] = await qb.getManyAndCount();
        return { items, total };
    }

    recordStandalone(data: RecordMovementInput): Promise<InventoryTransaction> {
        return this.transactionRepo.save(this.transactionRepo.create(data));
    }

    runTransaction<T>(work: (uow: InventoryUnitOfWork) => Promise<T>): Promise<T> {
        return this.dataSource.transaction((manager) => work(this.buildUnitOfWork(manager)));
    }

    private buildUnitOfWork(manager: EntityManager): InventoryUnitOfWork {
        return {
            lockVariant: (variantId) => this.lockVariant(manager, variantId),
            saveVariant: (variant) => manager.save(ProductVariant, variant),
            recordMovement: (data) => recordInventoryMovement(manager, data),
            refreshProductAggregates: (productId) => refreshProductAggregates(manager, productId),
        };
    }

    /** SELECT ... FOR UPDATE một variant — khoá trước khi trừ/cộng kho thủ công. */
    private async lockVariant(manager: EntityManager, variantId: string): Promise<ProductVariant> {
        const variant = await manager
            .createQueryBuilder(ProductVariant, 'variant')
            .setLock('pessimistic_write')
            .where('variant.id = :variantId', { variantId })
            .getOne();
        if (!variant) throw new NotFoundException(`Không tìm thấy biến thể với id ${variantId}`);
        return variant;
    }
}
