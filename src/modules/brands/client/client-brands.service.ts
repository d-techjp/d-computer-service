import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import { BrandsService } from '../application/brands.service';
import type { QueryBrandDto } from '../dto/query-brand.dto';
import { Brand } from '../entities/brand.entity';
import type { ClientQueryBrandDto } from './dto/client-query-brand.dto';

/**
 * Lớp mỏng bọc `BrandsService` cho storefront: siết phạm vi dữ liệu về đúng phần
 * khách được thấy. Nghiệp vụ (slug, CRUD) vẫn nằm nguyên ở service lõi.
 */
@Injectable()
export class ClientBrandsService {
    constructor(private readonly brandsService: BrandsService) {}

    findAll(query: ClientQueryBrandDto): Promise<PaginatedResult<Brand>> {
        // Gán trực tiếp lên instance thay vì spread để giữ getter `skip` trên prototype
        const criteria: QueryBrandDto = Object.assign(query, { isActive: true });
        return this.brandsService.findAll(criteria);
    }

    async findOne(id: string): Promise<Brand> {
        return this.assertVisible(await this.brandsService.findOne(id));
    }

    async findBySlug(slug: string): Promise<Brand> {
        return this.assertVisible(await this.brandsService.findBySlug(slug));
    }

    /** Thương hiệu đã tắt coi như không tồn tại với khách — trả 404 thay vì 403 để không lộ sự tồn tại. */
    private assertVisible(brand: Brand): Brand {
        if (!brand.isActive) throw new NotFoundException('Không tìm thấy thương hiệu');
        return brand;
    }
}
