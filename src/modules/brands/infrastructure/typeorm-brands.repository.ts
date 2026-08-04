import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import type { RepositoryPage } from '../../../common/interfaces/repository-page.interface';
import { resolveSortColumn } from '../../../common/utils/query.util';
import type { QueryBrandDto } from '../dto/query-brand.dto';
import { BrandsRepository } from '../domain/brands.repository';
import { Brand } from '../entities/brand.entity';

const SORTABLE_COLUMNS = ['createdAt', 'updatedAt', 'name', 'sortOrder'] as const;

/** Adapter TypeORM/Postgres cho `BrandsRepository` — toàn bộ QueryBuilder sống ở đây. */
@Injectable()
export class TypeOrmBrandsRepository extends BrandsRepository {
    constructor(@InjectRepository(Brand) private readonly repo: Repository<Brand>) {
        super();
    }

    create(data: Partial<Brand>): Brand {
        return this.repo.create(data);
    }

    save(brand: Brand): Promise<Brand> {
        return this.repo.save(brand);
    }

    async search(criteria: QueryBrandDto): Promise<RepositoryPage<Brand>> {
        const qb = this.repo.createQueryBuilder('brand');

        if (criteria.search) {
            qb.andWhere('(brand.name ILIKE :search OR brand.slug ILIKE :search)', {
                search: `%${criteria.search}%`,
            });
        }
        if (criteria.isActive !== undefined) {
            qb.andWhere('brand.isActive = :isActive', { isActive: criteria.isActive });
        }
        if (criteria.country)
            qb.andWhere('brand.country = :country', { country: criteria.country });

        const sortBy = resolveSortColumn(criteria.sortBy, SORTABLE_COLUMNS, 'sortOrder');
        qb.orderBy(`brand.${sortBy}`, criteria.sortOrder).skip(criteria.skip).take(criteria.limit);

        const [items, total] = await qb.getManyAndCount();
        return { items, total };
    }

    findById(id: string): Promise<Brand | null> {
        return this.repo.findOne({ where: { id } });
    }

    findBySlug(slug: string): Promise<Brand | null> {
        return this.repo.findOne({ where: { slug } });
    }

    async softRemove(brand: Brand): Promise<void> {
        await this.repo.softRemove(brand);
    }

    countBySlug(slug: string, excludeId?: string): Promise<number> {
        return this.repo.count({
            where: excludeId ? { slug, id: Not(excludeId) } : { slug },
        });
    }
}
