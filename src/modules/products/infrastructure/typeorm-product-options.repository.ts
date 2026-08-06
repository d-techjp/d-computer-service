import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ProductOptionsRepository } from '../domain/product-options.repository';
import type { ProductOptionInputDto } from '../dto/set-product-options.dto';
import { ProductOptionValue } from '../entities/product-option-value.entity';
import { ProductOption } from '../entities/product-option.entity';

@Injectable()
export class TypeOrmProductOptionsRepository extends ProductOptionsRepository {
    constructor(
        @InjectRepository(ProductOption) private readonly repo: Repository<ProductOption>,
        @InjectRepository(ProductOptionValue)
        private readonly valuesRepo: Repository<ProductOptionValue>,
        @InjectDataSource() private readonly dataSource: DataSource,
    ) {
        super();
    }

    findByProductId(productId: string): Promise<ProductOption[]> {
        return this.repo.find({
            where: { productId },
            relations: { values: true },
            order: { position: 'ASC', createdAt: 'ASC', values: { position: 'ASC' } },
        });
    }

    findValuesByIds(ids: string[]): Promise<ProductOptionValue[]> {
        if (ids.length === 0) return Promise.resolve([]);
        return this.valuesRepo.find({ where: { id: In(ids) }, relations: { option: true } });
    }

    async findValueIdsInUse(productId: string): Promise<string[]> {
        const rows: unknown = await this.valuesRepo.query(
            `SELECT DISTINCT "vov"."option_value_id" AS "id"
             FROM "product_variant_option_values" "vov"
             INNER JOIN "product_option_values" "pov" ON "pov"."id" = "vov"."option_value_id"
             INNER JOIN "product_options" "po" ON "po"."id" = "pov"."option_id"
             INNER JOIN "product_variants" "pv" ON "pv"."id" = "vov"."variant_id"
             WHERE "po"."product_id" = $1 AND "pv"."deleted_at" IS NULL`,
            [productId],
        );
        return (rows as { id: string }[]).map((row) => row.id);
    }

    /**
     * Xoá sạch rồi ghi lại — `product_option_values` bị cascade theo option, và
     * junction `product_variant_option_values` cascade theo value. Service đã
     * chặn trước trường hợp value đang được biến thể sử dụng, nên tới đây chỉ
     * còn việc ghi dữ liệu.
     */
    replaceAll(productId: string, options: ProductOptionInputDto[]): Promise<ProductOption[]> {
        return this.dataSource.transaction(async (manager) => {
            await manager.delete(ProductOption, { productId });

            const created = options.map((option, optionIndex) =>
                manager.create(ProductOption, {
                    productId,
                    name: option.name,
                    position: option.position ?? optionIndex,
                    values: option.values.map((value, valueIndex) =>
                        manager.create(ProductOptionValue, {
                            value: value.value,
                            position: value.position ?? valueIndex,
                        }),
                    ),
                }),
            );

            return manager.save(ProductOption, created);
        });
    }
}
