import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResult } from '../../common/dto/paginated-result.dto';
import { slugify } from '../../common/utils/slug.util';
import { BrandsService } from '../brands/brands.service';
import { CategoriesService } from '../categories/categories.service';
import { UploadFolder } from '../uploads/constants/upload.constants';
import { UploadsService } from '../uploads/uploads.service';
import { ProductDescriptionsRepository } from './domain/product-descriptions.repository';
import { ProductsRepository } from './domain/products.repository';
import type { CreateProductDto } from './dto/create-product.dto';
import type { QueryProductDto } from './dto/query-product.dto';
import type { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductType } from './entities/product.entity';
import { ProductVariantsService } from './product-variants.service';

export interface ProductImageFiles {
    thumbnailFile?: Express.Multer.File;
    imagesFiles?: Express.Multer.File[];
}

export interface ProductDescriptionView {
    productId: string;
    content: string;
}

/**
 * Quản lý product master. Mọi thao tác trên hàng bán được (giá, kho, SKU) nằm
 * ở `ProductVariantsService` — service này chỉ chạm tới biến thể đúng một lần,
 * lúc tạo sản phẩm, để master và biến thể đầu tiên ra đời trong cùng một lần lưu.
 */
@Injectable()
export class ProductsService {
    constructor(
        private readonly productsRepository: ProductsRepository,
        private readonly productDescriptionsRepository: ProductDescriptionsRepository,
        private readonly variantsService: ProductVariantsService,
        private readonly categoriesService: CategoriesService,
        private readonly brandsService: BrandsService,
        private readonly uploadsService: UploadsService,
    ) {}

    async create(dto: CreateProductDto, files?: ProductImageFiles): Promise<Product> {
        await this.assertRelationsExist(dto.categoryId, dto.brandId);

        const productType = dto.productType ?? ProductType.STANDARD;
        const { variants: variantInputs, ...master } = dto;
        const variants = await this.variantsService.buildForNewProduct(
            productType,
            dto.name,
            variantInputs,
        );

        const { thumbnail, images } = await this.resolveImages(dto, files);
        const product = await this.productsRepository.save(
            this.productsRepository.create({
                ...master,
                productType,
                thumbnail,
                images,
                slug: await this.resolveSlug(dto.slug ?? dto.name),
                variants, // cascade: ['insert'] — master + biến thể lưu cùng một lần
            }),
        );

        await this.productsRepository.refreshAggregates(product.id);
        return this.findOne(product.id);
    }

    async findAll(query: QueryProductDto): Promise<PaginatedResult<Product>> {
        // Resolve cây danh mục ở tầng service (nghiệp vụ) — repository chỉ lọc theo id phẳng
        const categoryIds =
            query.categoryId && query.includeSubCategories
                ? await this.categoriesService.collectSubtreeIds(query.categoryId)
                : undefined;

        const page = await this.productsRepository.search(query, categoryIds);
        return new PaginatedResult(page.items, page.total, query.page, query.limit);
    }

    async findOne(id: string): Promise<Product> {
        const product = await this.productsRepository.findById(id);
        if (!product) throw new NotFoundException(`Không tìm thấy sản phẩm với id ${id}`);
        return product;
    }

    async findBySlug(slug: string): Promise<Product> {
        const product = await this.productsRepository.findBySlug(slug);
        if (!product) throw new NotFoundException(`Không tìm thấy sản phẩm với slug ${slug}`);

        // Đếm lượt xem không chặn response và không đụng tới updatedAt
        await this.productsRepository.incrementViewCount(product.id);
        return product;
    }

    findByIds(ids: string[]): Promise<Product[]> {
        return this.productsRepository.findByIds(ids);
    }

    async update(id: string, dto: UpdateProductDto, files?: ProductImageFiles): Promise<Product> {
        const product = await this.findOne(id);
        await this.assertRelationsExist(dto.categoryId, dto.brandId);

        if (dto.slug && dto.slug !== product.slug) {
            product.slug = await this.resolveSlug(dto.slug, id);
        } else if (dto.name && dto.name !== product.name && !dto.slug) {
            product.slug = await this.resolveSlug(dto.name, id);
        }

        // Không gửi thumbnail/images (cả URL lẫn file) thì undefined -> giữ nguyên ảnh cũ.
        // Chỉ gửi imagesFiles (không kèm images) -> gộp thêm vào ảnh hiện có, không thay thế.
        const { thumbnail, images } = await this.resolveImages(dto, files, product.images);

        const { slug: _slug, ...rest } = dto;
        if (thumbnail !== undefined) rest.thumbnail = thumbnail;
        if (images !== undefined) rest.images = images;

        Object.assign(product, rest);
        await this.productsRepository.save(product);
        return this.findOne(id);
    }

    async remove(id: string): Promise<void> {
        await this.productsRepository.softRemove(await this.findOne(id));
    }

    async getDescription(productId: string): Promise<ProductDescriptionView> {
        await this.findOne(productId);
        const description = await this.productDescriptionsRepository.findByProductId(productId);
        return { productId, content: description?.content ?? '' };
    }

    async updateDescription(productId: string, content: string): Promise<ProductDescriptionView> {
        await this.findOne(productId);
        const description = await this.productDescriptionsRepository.upsert(productId, content);
        return { productId, content: description.content };
    }

    private async assertRelationsExist(
        categoryId?: string | null,
        brandId?: string | null,
    ): Promise<void> {
        if (categoryId) await this.categoriesService.findOne(categoryId);
        if (brandId) await this.brandsService.findOne(brandId);
    }

    private async resolveSlug(source: string, excludeId?: string): Promise<string> {
        const base = slugify(source);
        if (!base) throw new BadRequestException('Không tạo được slug hợp lệ từ tên sản phẩm');

        let candidate = base;
        let suffix = 1;
        while ((await this.productsRepository.countBySlug(candidate, excludeId)) > 0) {
            suffix += 1;
            candidate = `${base}-${suffix}`;
        }
        return candidate;
    }

    /**
     * `thumbnailFile`/`imagesFiles` (nếu có) được upload lên R2 rồi gộp với
     * `thumbnail`/`images` dạng URL sẵn có trong dto. Dùng chung cho create/update:
     *
     * - `thumbnail: undefined` = không đụng tới (giữ ảnh cũ ở update, không có ảnh ở create).
     * - `images: undefined` = không đụng tới danh sách ảnh hiện có.
     * - Chỉ gửi `imagesFiles` (không kèm `images`) ở update -> gộp thêm vào
     *   `existingImages`, không thay thế — nếu không, mỗi lần thêm 1 ảnh sẽ xoá
     *   sạch ảnh cũ vì client thường không gửi lại toàn bộ URL đang có.
     */
    private async resolveImages(
        dto: CreateProductDto | UpdateProductDto,
        files: ProductImageFiles | undefined,
        existingImages?: string[] | null,
    ): Promise<{ thumbnail: string | undefined; images: string[] | undefined }> {
        const thumbnail = files?.thumbnailFile
            ? (await this.uploadsService.uploadImage(files.thumbnailFile, UploadFolder.PRODUCTS))
                  .url
            : dto.thumbnail;

        const uploadedImages = files?.imagesFiles?.length
            ? (
                  await this.uploadsService.uploadImages(files.imagesFiles, UploadFolder.PRODUCTS)
              ).map((image) => image.url)
            : [];

        if (dto.images === undefined && uploadedImages.length === 0) {
            return { thumbnail, images: undefined };
        }

        const baseImages = dto.images ?? existingImages ?? [];
        return { thumbnail, images: [...baseImages, ...uploadedImages] };
    }
}
