import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ProductBundleItemsRepository } from '../domain/product-bundle-items.repository';
import type { BundleItemInputDto } from '../dto/set-bundle-items.dto';
import { ProductBundleItem } from '../entities/product-bundle-item.entity';
import { BundleInventoryPolicy, ProductVariant } from '../entities/product-variant.entity';

@Injectable()
export class TypeOrmProductBundleItemsRepository extends ProductBundleItemsRepository {
    constructor(
        @InjectRepository(ProductBundleItem) private readonly repo: Repository<ProductBundleItem>,
        @InjectDataSource() private readonly dataSource: DataSource,
    ) {
        super();
    }

    findByBundleVariantId(bundleVariantId: string): Promise<ProductBundleItem[]> {
        return this.repo.find({
            where: { bundleVariantId },
            relations: { componentVariant: { product: true } },
            order: { position: 'ASC', createdAt: 'ASC' },
        });
    }

    findByBundleVariantIds(bundleVariantIds: string[]): Promise<ProductBundleItem[]> {
        if (bundleVariantIds.length === 0) return Promise.resolve([]);
        return this.repo.find({
            where: { bundleVariantId: In(bundleVariantIds) },
            relations: { componentVariant: true },
            order: { position: 'ASC' },
        });
    }

    countByComponentVariantId(componentVariantId: string): Promise<number> {
        return this.repo.count({ where: { componentVariantId } });
    }

    async findDerivedBundleVariantIdsByComponentIds(
        componentVariantIds: string[],
    ): Promise<string[]> {
        if (componentVariantIds.length === 0) return [];

        const rows = await this.repo
            .createQueryBuilder('item')
            .select('DISTINCT item.bundle_variant_id', 'id')
            .innerJoin(ProductVariant, 'bundle', 'bundle.id = item.bundle_variant_id')
            .where('item.component_variant_id IN (:...ids)', { ids: componentVariantIds })
            .andWhere('bundle.bundle_inventory_policy = :policy', {
                policy: BundleInventoryPolicy.DERIVED_FROM_COMPONENTS,
            })
            .andWhere('bundle.deleted_at IS NULL')
            .getRawMany<{ id: string }>();

        return rows.map((row) => row.id);
    }

    replaceAll(bundleVariantId: string, items: BundleItemInputDto[]): Promise<ProductBundleItem[]> {
        return this.dataSource.transaction(async (manager) => {
            await manager.delete(ProductBundleItem, { bundleVariantId });

            return manager.save(
                ProductBundleItem,
                items.map((item, index) =>
                    manager.create(ProductBundleItem, {
                        bundleVariantId,
                        componentVariantId: item.componentVariantId,
                        quantity: item.quantity ?? 1,
                        position: item.position ?? index,
                        isOptional: item.isOptional ?? false,
                    }),
                ),
            );
        });
    }
}
