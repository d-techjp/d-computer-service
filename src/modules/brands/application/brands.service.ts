import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import { slugify } from '../../../common/utils/slug.util';
import { BrandsRepository } from '../domain/brands.repository';
import type { CreateBrandDto } from '../dto/create-brand.dto';
import type { QueryBrandDto } from '../dto/query-brand.dto';
import type { UpdateBrandDto } from '../dto/update-brand.dto';
import { Brand } from '../entities/brand.entity';

@Injectable()
export class BrandsService {
    constructor(private readonly brandsRepository: BrandsRepository) {}

    async create(dto: CreateBrandDto): Promise<Brand> {
        const slug = await this.resolveSlug(dto.slug ?? dto.name);
        return this.brandsRepository.save(this.brandsRepository.create({ ...dto, slug }));
    }

    async findAll(query: QueryBrandDto): Promise<PaginatedResult<Brand>> {
        const page = await this.brandsRepository.search(query);
        return new PaginatedResult(page.items, page.total, query.page, query.limit);
    }

    async findOne(id: string): Promise<Brand> {
        const brand = await this.brandsRepository.findById(id);
        if (!brand) throw new NotFoundException(`Không tìm thấy thương hiệu với id ${id}`);
        return brand;
    }

    async findBySlug(slug: string): Promise<Brand> {
        const brand = await this.brandsRepository.findBySlug(slug);
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

    /** Sinh slug duy nhất; nếu trùng thì nối hậu tố -2, -3, ... — quy tắc nghiệp vụ, không phải persistence. */
    private async resolveSlug(source: string, excludeId?: string): Promise<string> {
        const base = slugify(source);
        if (!base) throw new BadRequestException('Không tạo được slug hợp lệ từ tên thương hiệu');

        let candidate = base;
        let suffix = 1;
        while ((await this.brandsRepository.countBySlug(candidate, excludeId)) > 0) {
            suffix += 1;
            candidate = `${base}-${suffix}`;
        }
        return candidate;
    }
}
