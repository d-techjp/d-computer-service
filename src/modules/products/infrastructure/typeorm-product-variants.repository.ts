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

    countBySku(sku: string, excludeId?: string): Promise<number> {
        return this.repo.count({ where: excludeId ? { sku, id: Not(excludeId) } : { sku } });
    }

    async softRemove(variant: ProductVariant): Promise<void> {
        await this.repo.softRemove(variant);
    }

    async clearDefaultFlag(productId: string, exceptVariantId: string): Promise<void> {
        await this.repo.update(
            { productId, isDefault: true, id: Not(exceptVariantId) },
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
