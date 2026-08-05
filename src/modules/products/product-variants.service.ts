import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { slugify } from '../../common/utils/slug.util';
import { UploadFolder } from '../uploads/constants/upload.constants';
import { UploadsService } from '../uploads/uploads.service';
import { ProductOptionsRepository } from './domain/product-options.repository';
import { ProductBundleItemsRepository } from './domain/product-bundle-items.repository';
import { ProductVariantsRepository } from './domain/product-variants.repository';
import { ProductsRepository } from './domain/products.repository';
import type { CreateVariantDto } from './dto/create-variant.dto';
import type { GenerateVariantsDto } from './dto/set-product-options.dto';
import type { UpdateVariantDto } from './dto/update-variant.dto';
import type { ProductOptionValue } from './entities/product-option-value.entity';
import { BundleInventoryPolicy, ProductVariant } from './entities/product-variant.entity';
import { Product, ProductType } from './entities/product.entity';
import { ProductBundlesService } from './product-bundles.service';

const LOW_STOCK_LIMIT = 50;

export interface VariantImageFiles {
    thumbnailFile?: Express.Multer.File;
    imagesFiles?: Express.Multer.File[];
}

@Injectable()
export class ProductVariantsService {
    constructor(
        private readonly variantsRepository: ProductVariantsRepository,
        private readonly productsRepository: ProductsRepository,
        private readonly optionsRepository: ProductOptionsRepository,
        private readonly bundleItemsRepository: ProductBundleItemsRepository,
        private readonly bundlesService: ProductBundlesService,
        private readonly uploadsService: UploadsService,
    ) {}

    /**
     * Dựng (chưa lưu) danh sách biến thể cho luồng tạo sản phẩm. Trả về entity
     * chưa persist để `ProductsService` lưu kèm master trong một lần save —
     * nhờ vậy không bao giờ tồn tại product "rỗng" nếu bước sau lỗi.
     */
    async buildForNewProduct(
        productType: ProductType,
        productName: string,
        inputs: CreateVariantDto[],
    ): Promise<ProductVariant[]> {
        this.assertSkusUniqueWithinBatch(inputs);
        for (const input of inputs) {
            await this.assertSkuAvailable(input.sku);
            this.assertPriceConsistent(input.price, input.compareAtPrice);
            this.assertBundlePolicy(productType, input.bundleInventoryPolicy);
        }

        const defaultIndex = Math.max(
            inputs.findIndex((input) => input.isDefault === true),
            0,
        );

        return inputs.map((input, index) =>
            this.variantsRepository.create({
                ...input,
                name: input.name ?? productName,
                position: input.position ?? index,
                isDefault: index === defaultIndex,
                trackInventory: this.resolveTrackInventory(productType, input),
                bundleInventoryPolicy: input.bundleInventoryPolicy ?? null,
            }),
        );
    }

    findByProduct(productId: string): Promise<ProductVariant[]> {
        return this.variantsRepository.findByProductId(productId);
    }

    async findOne(id: string): Promise<ProductVariant> {
        const variant = await this.variantsRepository.findById(id);
        if (!variant) throw new NotFoundException(`Không tìm thấy biến thể với id ${id}`);
        return variant;
    }

    async create(productId: string, dto: CreateVariantDto): Promise<ProductVariant> {
        const product = await this.findProductOrFail(productId);

        await this.assertSkuAvailable(dto.sku);
        this.assertPriceConsistent(dto.price, dto.compareAtPrice);
        this.assertBundlePolicy(product.productType, dto.bundleInventoryPolicy);

        const optionValues = await this.resolveOptionValues(product, dto.optionValueIds);

        const variant = await this.variantsRepository.save(
            this.variantsRepository.create({
                ...dto,
                productId,
                name: dto.name ?? this.buildVariantName(optionValues) ?? product.name,
                isDefault: dto.isDefault ?? false,
                trackInventory: this.resolveTrackInventory(product.productType, dto),
                bundleInventoryPolicy: dto.bundleInventoryPolicy ?? null,
                optionValues,
            }),
        );

        await this.applyDefaultFlag(variant);
        await this.productsRepository.refreshAggregates(productId);
        return this.findOne(variant.id);
    }

    async update(
        id: string,
        dto: UpdateVariantDto,
        files?: VariantImageFiles,
    ): Promise<ProductVariant> {
        const variant = await this.findOne(id);

        if (dto.sku && dto.sku !== variant.sku) await this.assertSkuAvailable(dto.sku, id);
        this.assertPriceConsistent(
            dto.price ?? variant.price,
            dto.compareAtPrice ?? variant.compareAtPrice,
        );
        if (dto.bundleInventoryPolicy !== undefined) {
            this.assertBundlePolicy(variant.product.productType, dto.bundleInventoryPolicy);
        }
        if (dto.stock !== undefined && this.isDerivedBundle(variant)) {
            throw new BadRequestException(
                'Không đặt tồn kho trực tiếp cho combo derived_from_components — ' +
                    'tồn kho suy ra từ thành phần',
            );
        }

        const { thumbnail, images } = await this.resolveImages(dto, files, variant.images);
        const { thumbnailFile: _thumbnailFile, imagesFiles: _imagesFiles, ...rest } = dto;
        if (thumbnail !== undefined) rest.thumbnail = thumbnail;
        if (images !== undefined) rest.images = images;

        Object.assign(variant, rest);
        const saved = await this.variantsRepository.save(variant);

        await this.applyDefaultFlag(saved);
        await this.productsRepository.refreshAggregates(saved.productId);
        // Đổi giá/tồn kho/bật-tắt của một biến thể có thể làm đổi tồn kho combo
        // đang dùng nó làm thành phần.
        await this.bundlesService.refreshBundlesContaining([saved.id]);
        return this.findOne(saved.id);
    }

    /**
     * Xoá mềm. Chặn hai trường hợp làm hỏng dữ liệu: xoá biến thể cuối cùng
     * (sản phẩm sẽ không còn gì bán được) và xoá biến thể đang là thành phần
     * của combo. Biến thể mặc định bị xoá thì tự đề cử biến thể còn lại.
     */
    async remove(id: string): Promise<void> {
        const variant = await this.findOne(id);

        if ((await this.variantsRepository.countByProductId(variant.productId)) <= 1) {
            throw new BadRequestException(
                'Không xoá được biến thể cuối cùng — xoá cả sản phẩm nếu muốn ngừng bán',
            );
        }
        if ((await this.bundleItemsRepository.countByComponentVariantId(id)) > 0) {
            throw new BadRequestException(
                'Biến thể đang là thành phần của một combo — gỡ khỏi combo trước khi xoá',
            );
        }

        await this.variantsRepository.softRemove(variant);

        if (variant.isDefault) {
            const remaining = await this.variantsRepository.findByProductId(variant.productId);
            if (remaining[0]) {
                remaining[0].isDefault = true;
                await this.variantsRepository.save(remaining[0]);
            }
        }

        await this.productsRepository.refreshAggregates(variant.productId);
    }

    /** Điều chỉnh tồn kho thủ công (nhập hàng, kiểm kê). `delta` âm để trừ. */
    async adjustStock(id: string, delta: number, reason?: string): Promise<ProductVariant> {
        const variant = await this.findOne(id);

        if (!variant.trackInventory) {
            throw new BadRequestException(
                `Biến thể "${variant.sku}" không theo dõi tồn kho (trackInventory = false)`,
            );
        }
        if (this.isDerivedBundle(variant)) {
            throw new BadRequestException(
                'Tồn kho combo derived_from_components suy ra từ thành phần — ' +
                    'điều chỉnh kho của thành phần thay vì combo',
            );
        }

        const nextStock = variant.stock + delta;
        if (nextStock < 0) {
            throw new BadRequestException(
                `Tồn kho không đủ: hiện có ${variant.stock}, yêu cầu giảm ${Math.abs(delta)}`,
            );
        }

        variant.stock = nextStock;
        void reason; // reason được ghi ở activity log qua interceptor

        const saved = await this.variantsRepository.save(variant);
        await this.productsRepository.refreshAggregates(saved.productId);
        await this.bundlesService.refreshBundlesContaining([saved.id]);
        return saved;
    }

    /** Biến thể có tồn kho <= ngưỡng cảnh báo. */
    findLowStock(): Promise<ProductVariant[]> {
        return this.variantsRepository.findLowStock(LOW_STOCK_LIMIT);
    }

    /**
     * Sinh biến thể cho MỌI tổ hợp option chưa tồn tại (tích Descartes). Tổ hợp
     * đã có thì bỏ qua, nên gọi lại nhiều lần vẫn an toàn — thêm một giá trị
     * option mới rồi generate lại chỉ sinh phần thiếu.
     */
    async generateFromOptions(
        productId: string,
        dto: GenerateVariantsDto,
    ): Promise<ProductVariant[]> {
        const product = await this.findProductOrFail(productId);
        if (product.productType === ProductType.BUNDLE) {
            throw new BadRequestException('Combo không sinh biến thể từ option');
        }

        const options = await this.optionsRepository.findByProductId(productId);
        if (options.length === 0) {
            throw new BadRequestException(
                'Sản phẩm chưa khai option — gọi PUT /products/:id/options trước',
            );
        }

        const existing = await this.variantsRepository.findByProductId(productId);
        const existingKeys = new Set(
            existing.map((variant) => this.optionValueKey(variant.optionValues ?? [])),
        );

        const combinations = options.reduce<ProductOptionValue[][]>(
            (acc, option) =>
                acc.flatMap((combo) => option.values.map((value) => [...combo, value])),
            [[]],
        );

        const takenSkus = new Set(existing.map((variant) => variant.sku));
        const created: ProductVariant[] = [];

        for (const combination of combinations) {
            if (existingKeys.has(this.optionValueKey(combination))) continue;

            const sku = await this.buildUniqueSku(dto.skuPrefix, combination, takenSkus);
            takenSkus.add(sku);

            created.push(
                this.variantsRepository.create({
                    productId,
                    name: this.buildVariantName(combination) ?? product.name,
                    sku,
                    price: dto.price,
                    stock: dto.stock ?? 0,
                    position: existing.length + created.length,
                    isDefault: false,
                    optionValues: combination,
                }),
            );
        }

        // Luôn trả về toàn bộ biến thể, kể cả khi không sinh thêm gì — FE dùng
        // thẳng kết quả này để vẽ lại bảng biến thể, không phải gọi lại danh sách.
        if (created.length > 0) {
            await this.variantsRepository.saveMany(created);
            await this.productsRepository.refreshAggregates(productId);
        }
        return this.variantsRepository.findByProductId(productId);
    }

    private async findProductOrFail(productId: string): Promise<Product> {
        const product = await this.productsRepository.findById(productId);
        if (!product) throw new NotFoundException(`Không tìm thấy sản phẩm với id ${productId}`);
        return product;
    }

    /** Đúng một biến thể mặc định mỗi sản phẩm — partial unique index chỉ đỡ được phần chèn. */
    private async applyDefaultFlag(variant: ProductVariant): Promise<void> {
        if (!variant.isDefault) return;
        await this.variantsRepository.clearDefaultFlag(variant.productId, variant.id);
    }

    private isDerivedBundle(variant: ProductVariant): boolean {
        return variant.bundleInventoryPolicy === BundleInventoryPolicy.DERIVED_FROM_COMPONENTS;
    }

    /** Dịch vụ mặc định không quản kho; hàng hoá mặc định có quản kho. */
    private resolveTrackInventory(
        productType: ProductType,
        input: { trackInventory?: boolean },
    ): boolean {
        if (input.trackInventory !== undefined) return input.trackInventory;
        return productType !== ProductType.SERVICE;
    }

    private assertPriceConsistent(price: number, compareAtPrice: number | null | undefined): void {
        if (compareAtPrice !== null && compareAtPrice !== undefined && compareAtPrice < price) {
            throw new BadRequestException('compareAtPrice phải lớn hơn hoặc bằng price');
        }
    }

    private assertBundlePolicy(
        productType: ProductType,
        policy: BundleInventoryPolicy | null | undefined,
    ): void {
        if (productType === ProductType.BUNDLE && !policy) {
            throw new BadRequestException(
                'Biến thể của combo phải khai bundleInventoryPolicy ' +
                    '(derived_from_components hoặc own_stock)',
            );
        }
        if (productType !== ProductType.BUNDLE && policy) {
            throw new BadRequestException(
                'bundleInventoryPolicy chỉ dùng cho sản phẩm có productType = bundle',
            );
        }
    }

    private assertSkusUniqueWithinBatch(inputs: CreateVariantDto[]): void {
        const skus = inputs.map((input) => input.sku);
        if (new Set(skus).size !== skus.length) {
            throw new BadRequestException('Các biến thể trong cùng một sản phẩm bị trùng SKU');
        }
    }

    private async assertSkuAvailable(sku: string, excludeId?: string): Promise<void> {
        if ((await this.variantsRepository.countBySku(sku, excludeId)) > 0) {
            throw new ConflictException(`SKU ${sku} đã tồn tại`);
        }
    }

    /**
     * Tổ hợp option phải phủ đúng một giá trị cho MỖI option của sản phẩm —
     * thiếu hoặc thừa đều tạo ra biến thể không xác định được là cấu hình nào.
     */
    private async resolveOptionValues(
        product: Product,
        optionValueIds: string[] | undefined,
    ): Promise<ProductOptionValue[]> {
        const options = await this.optionsRepository.findByProductId(product.id);
        if (options.length === 0) return [];

        const ids = optionValueIds ?? [];
        const values = await this.optionsRepository.findValuesByIds(ids);

        if (values.length !== ids.length) {
            throw new BadRequestException('Có optionValueId không tồn tại');
        }

        const optionIds = new Set(options.map((option) => option.id));
        for (const value of values) {
            if (!optionIds.has(value.optionId)) {
                throw new BadRequestException(
                    `Giá trị "${value.value}" không thuộc option nào của sản phẩm này`,
                );
            }
        }

        const covered = new Set(values.map((value) => value.optionId));
        if (covered.size !== options.length || covered.size !== values.length) {
            throw new BadRequestException(
                `Phải chọn đúng 1 giá trị cho mỗi option: ${options
                    .map((option) => option.name)
                    .join(', ')}`,
            );
        }

        return values;
    }

    private buildVariantName(values: ProductOptionValue[]): string | null {
        if (values.length === 0) return null;
        return values.map((value) => value.value).join(' / ');
    }

    private optionValueKey(values: ProductOptionValue[]): string {
        return values
            .map((value) => value.id)
            .sort()
            .join('|');
    }

    private async buildUniqueSku(
        prefix: string,
        combination: ProductOptionValue[],
        taken: Set<string>,
    ): Promise<string> {
        const suffix = combination.map((value) => slugify(value.value)).join('-');
        const base = `${prefix}-${suffix}`.toUpperCase().slice(0, 100);

        let candidate = base;
        let attempt = 1;
        while (taken.has(candidate) || (await this.variantsRepository.countBySku(candidate)) > 0) {
            attempt += 1;
            candidate = `${base}-${attempt}`.slice(0, 100);
        }
        return candidate;
    }

    /**
     * Gộp ảnh upload (R2) với ảnh dạng URL trong dto — cùng ngữ nghĩa với ảnh
     * của product: `undefined` = giữ nguyên, chỉ gửi file = gộp thêm chứ không
     * thay thế danh sách đang có.
     */
    private async resolveImages(
        dto: UpdateVariantDto,
        files: VariantImageFiles | undefined,
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

        return { thumbnail, images: [...(dto.images ?? existingImages ?? []), ...uploadedImages] };
    }
}
