import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductDescriptionsRepository } from '../domain/product-descriptions.repository';
import { ProductDescription } from '../entities/product-description.entity';

@Injectable()
export class TypeOrmProductDescriptionsRepository extends ProductDescriptionsRepository {
    constructor(
        @InjectRepository(ProductDescription)
        private readonly repo: Repository<ProductDescription>,
    ) {
        super();
    }

    findByProductId(productId: string): Promise<ProductDescription | null> {
        return this.repo.findOne({ where: { productId } });
    }

    async upsert(productId: string, content: string): Promise<ProductDescription> {
        const existing = await this.findByProductId(productId);
        if (existing) {
            existing.content = content;
            return this.repo.save(existing);
        }
        return this.repo.save(this.repo.create({ productId, content }));
    }
}
