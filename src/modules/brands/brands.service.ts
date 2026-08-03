import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { PaginatedResult } from '../../common/dto/paginated-result.dto';
import { resolveSortColumn } from '../../common/utils/query.util';
import { slugify } from '../../common/utils/slug.util';
import type { CreateBrandDto } from './dto/create-brand.dto';
import type { QueryBrandDto } from './dto/query-brand.dto';
import type { UpdateBrandDto } from './dto/update-brand.dto';
import { Brand } from './entities/brand.entity';

const SORTABLE_COLUMNS = ['createdAt', 'updatedAt', 'name', 'sortOrder'] as const;

@Injectable()
export class BrandsService {
    constructor(@InjectRepository(Brand) private readonly brandsRepository: Repository<Brand>) {}

    async create(dto: CreateBrandDto): Promise<Brand> {
        const slug = await this.resolveSlug(dto.slug ?? dto.name);
        return this.brandsRepository.save(this.brandsRepository.create({ ...dto, slug }));
    }

    async findAll(query: QueryBrandDto): Promise<PaginatedResult<Brand>> {
        const qb = this.brandsRepository.createQueryBuilder('brand');

        if (query.search) {
            qb.andWhere('(brand.name ILIKE :search OR brand.slug ILIKE :search)', {
                search: `%${query.search}%`,
            });
        }
        if (query.isActive !== undefined) {
            qb.andWhere('brand.isActive = :isActive', { isActive: query.isActive });
        }
        if (query.country) qb.andWhere('brand.country = :country', { country: query.country });

        const sortBy = resolveSortColumn(query.sortBy, SORTABLE_COLUMNS, 'sortOrder');
        qb.orderBy(`brand.${sortBy}`, query.sortOrder).skip(query.skip).take(query.limit);

        const [items, total] = await qb.getManyAndCount();
        return new PaginatedResult(items, total, query.page, query.limit);
    }

    async findOne(id: string): Promise<Brand> {
        const brand = await this.brandsRepository.findOne({ where: { id } });
        if (!brand) throw new NotFoundException(`Không tìm thấy thương hiệu với id ${id}`);
        return brand;
    }

    async findBySlug(slug: string): Promise<Brand> {
        const brand = await this.brandsRepository.findOne({ where: { slug } });
        if (!brand) throw new NotFoundException(`Không tìm thấy thương hiệu với slug ${slug}`);
        return brand;
    }

    async update(id: string, dto: UpdateBrandDto): Promise<Brand> {
        const brand = await this.findOne(id);

        if (dto.slug && dto.slug !== brand.slug) {
            brand.slug = await this.resolveSlug(dto.slug, id);
        } else if (dto.name && dto.name !== brand.name && !dto.slug) {
            brand.slug = await this.resolveSlug(dto.name, id);
        }

        const { slug: _slug, ...rest } = dto;
        Object.assign(brand, rest);
        return this.brandsRepository.save(brand);
    }

    async remove(id: string): Promise<void> {
        await this.brandsRepository.softRemove(await this.findOne(id));
    }

    private async resolveSlug(source: string, excludeId?: string): Promise<string> {
        const base = slugify(source);
        if (!base) throw new BadRequestException('Không tạo được slug hợp lệ từ tên thương hiệu');

        let candidate = base;
        let suffix = 1;
        while (
            (await this.brandsRepository.count({
                where: excludeId ? { slug: candidate, id: Not(excludeId) } : { slug: candidate },
            })) > 0
        ) {
            suffix += 1;
            candidate = `${base}-${suffix}`;
        }
        return candidate;
    }
}
