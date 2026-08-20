import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import { BrandsService } from '../../brands/application/brands.service';
import { CategoriesService } from '../../categories/application/categories.service';
import type { ProductDescriptionView } from '../application/products.service';
import { ProductsService } from '../application/products.service';
import type { QueryProductDto } from '../dto/query-product.dto';
import { Product } from '../entities/product.entity';
import { VISIBLE_STATUSES } from './client-visibility';
import type { ClientQueryProductDto } from './dto/client-query-product.dto';

/** Lớp mỏng bọc `ProductsService` cho storefront: mọi truy vấn đều bị rào theo `VISIBLE_STATUSES`. */
@Injectable()
export class ClientProductsService {
    constructor(
        private readonly productsService: ProductsService,
        private readonly categoriesService: CategoriesService,
        private readonly brandsService: BrandsService,
    ) {}

    /**
     * Storefront lọc theo slug (SEO-friendly URL); `ProductsService`/repository vẫn
     * chỉ biết lọc theo uuid, nên slug được resolve ở đây trước khi giao xuống dưới.
     * Slug lạ -> `NotFoundException` từ `findBySlug`, giống cách trang chi tiết sản
     * phẩm 404 khi slug không tồn tại, thay vì âm thầm trả danh sách rỗng.
     */
    async findAll(query: ClientQueryProductDto): Promise<PaginatedResult<Product>> {
        const { category, brand } = query;
        const [categoryId, brandId] = await Promise.all([
            category ? this.categoriesService.findBySlug(category).then((c) => c.id) : undefined,
            brand ? this.brandsService.findBySlug(brand).then((b) => b.id) : undefined,
        ]);

        // Object.assign, KHÔNG spread — spread làm mất getter `skip` trên prototype
        // của PaginationQueryDto (xem quy ước tách client/admin của các module khác).
        // ClientQueryProductDto là tập con của QueryProductDto (thiếu đúng `status`),
        // và rào trạng thái đi qua tham số riêng nên client không nới rộng được.
        const criteria: QueryProductDto = Object.assign(query, { categoryId, brandId });
        return this.productsService.findAll(criteria, VISIBLE_STATUSES);
    }

    findOne(id: string): Promise<Product> {
        return this.productsService.findOne(id, VISIBLE_STATUSES);
    }

    findBySlug(slug: string): Promise<Product> {
        return this.productsService.findBySlug(slug, VISIBLE_STATUSES);
    }

    getDescription(id: string): Promise<ProductDescriptionView> {
        return this.productsService.getDescription(id, VISIBLE_STATUSES);
    }

    /** Xác nhận sản phẩm hiển thị được rồi mới cho đọc dữ liệu con (biến thể, option). */
    assertVisible(id: string): Promise<void> {
        return this.productsService.assertExists(id, VISIBLE_STATUSES);
    }
}
