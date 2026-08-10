import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { ProductVariantsRepository } from '../domain/product-variants.repository';
import { ProductVariant } from '../entities/product-variant.entity';
import { ProductStatus } from '../entities/product.entity';

@Injectable()
export class TypeOrmProductVariantsRepository extends ProductVariantsRepository {
    constructor(
        @InjectRepository(ProductVariant) private readonly repo: Repository<ProductVariant>,
    ) {
        super();
    }

    create(data: Partial<ProductVariant>): ProductVariant {
        return this.repo.create(data);
    }

    save(variant: ProductVariant): Promise<ProductVariant> {
        return this.repo.save(variant);
    }

    saveMany(variants: ProductVariant[]): Promise<ProductVariant[]> {
        return this.repo.save(variants);
    }

    findById(id: string): Promise<ProductVariant | null> {
        return this.repo.findOne({
            where: { id },
            relations: { product: true, optionValues: { option: true } },
        });
    }

    findByIds(ids: string[]): Promise<ProductVariant[]> {
        if (ids.length === 0) return Promise.resolve([]);
        return this.repo.find({ where: { id: In(ids) }, relations: { product: true } });
    }

    async findCostPrices(variantIds: string[]): Promise<Map<string, number | null>> {
        if (variantIds.length === 0) return new Map();

        // Khai `select` tường minh là cách duy nhất kéo được cột `select: false`
        // ra. Đi qua entity (không phải getRawMany) nên `ColumnNumericTransformer`
        // vẫn chạy và trả number thay vì string của driver pg.
        const rows = await this.repo.find({
            where: { id: In(variantIds) },
            select: { id: true, costPrice: true },
        });
        return new Map(rows.map((row) => [row.id, row.costPrice]));
    }

    findByProductId(productId: string): Promise<ProductVariant[]> {
        return this.repo.find({
            where: { productId },
            relations: { optionValues: { option: true } },
            order: { position: 'ASC', createdAt: 'ASC' },
        });
    }

    findDefaultByProductId(productId: string): Promise<ProductVariant | null> {
        return this.repo.findOne({ where: { productId, isDefault: true } });
    }

    countByProductId(productId: string): Promise<number> {
        return this.repo.count({ where: { productId } });
    }

    async countByProductIds(productIds: string[]): Promise<Map<string, number>> {
        if (productIds.length === 0) return new Map();

        const rows = await this.repo
            .createQueryBuilder('variant')
            .select('variant.productId', 'productId')
            .addSelect('COUNT(*)', 'count')
            .where('variant.productId IN (:...productIds)', { productIds })
            .groupBy('variant.productId')
            .getRawMany<{ productId: string; count: string }>();

        return new Map(rows.map((row) => [row.productId, Number(row.count)]));
    }

    countBySku(sku: string, excludeId?: string): Promise<number> {
        return this.repo.count({ where: excludeId ? { sku, id: Not(excludeId) } : { sku } });
    }

    async softRemove(variant: ProductVariant): Promise<void> {
        await this.repo.softRemove(variant);
    }

    async clearDefaultFlag(productId: string, exceptVariantId?: string): Promise<void> {
        await this.repo.update(
            exceptVariantId
                ? { productId, isDefault: true, id: Not(exceptVariantId) }
                : { productId, isDefault: true },
            { isDefault: false },
        );
    }

    findLowStock(limit: number): Promise<ProductVariant[]> {
        return this.repo
            .createQueryBuilder('variant')
            .innerJoinAndSelect('variant.product', 'product')
            .where('variant.trackInventory = true')
            .andWhere('variant.isActive = true')
            .andWhere('variant.stock <= variant.lowStockThreshold')
            .andWhere('product.status != :archived', { archived: ProductStatus.ARCHIVED })
            .orderBy('variant.stock', 'ASC')
            .take(limit)
            .getMany();
    }
}
