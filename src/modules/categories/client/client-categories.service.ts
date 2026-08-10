import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import { CategoriesService } from '../application/categories.service';
import type { QueryCategoryDto } from '../dto/query-category.dto';
import { Category } from '../entities/category.entity';
import type { ClientQueryCategoryDto } from './dto/client-query-category.dto';

/**
 * Lớp mỏng bọc `CategoriesService` cho storefront: siết phạm vi dữ liệu về đúng
 * phần khách được thấy. Nghiệp vụ (cây, slug, CRUD) vẫn nằm nguyên ở service lõi.
 */
@Injectable()
export class ClientCategoriesService {
    constructor(private readonly categoriesService: CategoriesService) {}

    findAll(query: ClientQueryCategoryDto): Promise<PaginatedResult<Category>> {
        // Gán trực tiếp lên instance thay vì spread để giữ getter `skip` trên prototype
        const criteria: QueryCategoryDto = Object.assign(query, { isActive: true });
        return this.categoriesService.findAll(criteria);
    }

    /** Cây danh mục cho menu storefront — luôn cắt bỏ nhánh đã tắt. */
    findTree(): Promise<Category[]> {
        return this.categoriesService.findTree(true);
    }

    async findOne(id: string): Promise<Category> {
        return this.assertVisible(await this.categoriesService.findOne(id));
    }

    async findBySlug(slug: string): Promise<Category> {
        return this.assertVisible(await this.categoriesService.findBySlug(slug));
    }

    /** Danh mục đã tắt coi như không tồn tại với khách — trả 404 thay vì 403 để không lộ sự tồn tại. */
    private assertVisible(category: Category): Category {
        if (!category.isActive) throw new NotFoundException('Không tìm thấy danh mục');
        return category;
    }
}
