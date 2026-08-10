import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { SoftDeletableEntity } from '../../../common/entities/base.entity';
import { ColumnNumericTransformer } from '../../../common/transformers/numeric.transformer';
import { Brand } from '../../brands/entities/brand.entity';
import { Category } from '../../categories/entities/category.entity';
import { ProductOption } from './product-option.entity';
import { ProductVariant } from './product-variant.entity';

export enum ProductStatus {
    DRAFT = 'draft',
    ACTIVE = 'active',
    OUT_OF_STOCK = 'out_of_stock',
    ARCHIVED = 'archived',
}

export enum ProductType {
    /** Hàng hoá thường — bán qua variant, mỗi variant có tồn kho riêng. */
    STANDARD = 'standard',
    /** Combo/kit ghép từ variant của các sản phẩm standard qua `product_bundle_items`. */
    BUNDLE = 'bundle',
    /** Dịch vụ (cài win, vệ sinh máy, bảo hành mở rộng) — không quản kho, không ship. */
    SERVICE = 'service',
}

/**
 * Một dòng thông số kỹ thuật, lưu trong `Product.specifications` dưới dạng mảng
 * JSONB. Trước đây là `Record<string, string>` — object key trong JSONB của
 * Postgres KHÔNG đảm bảo giữ thứ tự chèn (đây là hành vi được tài liệu hoá,
 * không phải bug), nên thứ tự hiển thị có thể bị xáo khi đọc lại. Mảng thì
 * Postgres giữ nguyên thứ tự phần tử, và `position` tường minh để FE sắp xếp
 * mà không phải dựa vào thứ tự mảng (dù server luôn đồng bộ hai thứ khớp nhau).
 */
export class ProductSpecification {
    @ApiProperty({ example: 'CPU' })
    name: string;

    @ApiProperty({ example: 'Intel Core i5-1235U' })
    value: string;

    @ApiProperty({ default: 0, description: 'Thứ tự hiển thị, 0-based' })
    position: number;
}

/**
 * Product master — KHÔNG bán trực tiếp. Chỉ giữ thông tin dùng chung cho mọi
 * biến thể: tên, slug, taxonomy, ảnh/thông số chung, số liệu tổng hợp.
 *
 * Mọi thứ *biến thiên theo từng phiên bản bán ra* (sku, giá, giá vốn, tồn kho)
 * nằm ở `ProductVariant`. Sản phẩm không có biến thể vẫn có đúng một variant
 * `isDefault = true` — nhờ vậy giỏ hàng/đơn hàng chỉ cần biết tới variant.
 */
@Entity('products')
@Index('idx_products_category_status', ['categoryId', 'status'])
@Index('idx_products_type_status', ['productType', 'status'])
@Index('idx_products_status_min_price', ['status', 'minPrice'])
export class Product extends SoftDeletableEntity {
    @ApiProperty({ example: 'Laptop Dell Vostro 3520' })
    @Column({ type: 'varchar', length: 255 })
    name: string;

    @ApiProperty({ example: 'laptop-dell-vostro-3520' })
    @Index('uq_products_slug', { unique: true, where: '"deleted_at" IS NULL' })
    @Column({ type: 'varchar', length: 300 })
    slug: string;

    @ApiProperty({ enum: ProductType, default: ProductType.STANDARD })
    @Column({ type: 'enum', enum: ProductType, default: ProductType.STANDARD })
    productType: ProductType;

    @ApiProperty({ enum: ProductStatus, default: ProductStatus.DRAFT })
    @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.DRAFT })
    status: ProductStatus;

    @ApiPropertyOptional()
    @Column({ type: 'varchar', length: 500, nullable: true })
    shortDescription: string | null;

    @ApiPropertyOptional({ description: 'Ảnh đại diện chung — variant có thể override' })
    @Column({ type: 'varchar', length: 500, nullable: true })
    thumbnail: string | null;

    @ApiPropertyOptional({ type: [String] })
    @Column({ type: 'jsonb', nullable: true })
    images: string[] | null;

    @ApiPropertyOptional({
        type: () => [ProductSpecification],
        description:
            'Thông số DÙNG CHUNG mọi biến thể, sắp theo `position`. ' +
            'Thông số khác nhau giữa các biến thể thì khai bằng ProductOption.',
    })
    @Column({ type: 'jsonb', nullable: true })
    specifications: ProductSpecification[] | null;

    @ApiProperty({ default: false })
    @Column({ type: 'boolean', default: false })
    isFeatured: boolean;

    @ApiProperty({
        default: false,
        description:
            'Denormalized: true khi có > 1 variant — FE dùng để quyết định hiện variant picker',
    })
    @Column({ type: 'boolean', default: false })
    hasVariants: boolean;

    @ApiProperty({ default: 0, description: 'Lượt xem' })
    @Column({ type: 'int', default: 0 })
    viewCount: number;

    @ApiProperty({ default: 0, description: 'Tổng đã bán, cộng dồn từ các variant' })
    @Column({ type: 'int', default: 0 })
    soldCount: number;

    @ApiPropertyOptional({ example: 15990000, description: 'Denormalized MIN(variant.price)' })
    @Column({
        type: 'numeric',
        precision: 14,
        scale: 2,
        nullable: true,
        transformer: new ColumnNumericTransformer(),
    })
    minPrice: number | null;

    @ApiPropertyOptional({ example: 21990000, description: 'Denormalized MAX(variant.price)' })
    @Column({
        type: 'numeric',
        precision: 14,
        scale: 2,
        nullable: true,
        transformer: new ColumnNumericTransformer(),
    })
    maxPrice: number | null;

    @ApiProperty({ default: 0, description: 'Denormalized SUM(variant.stock)' })
    @Column({ type: 'int', default: 0 })
    totalStock: number;

    @ApiPropertyOptional({ format: 'uuid' })
    @Column({ type: 'uuid', nullable: true })
    categoryId: string | null;

    @ManyToOne(() => Category, (category) => category.products, {
        onDelete: 'SET NULL',
        nullable: true,
    })
    @JoinColumn({ name: 'category_id' })
    category: Category | null;

    @ApiPropertyOptional({ format: 'uuid' })
    @Column({ type: 'uuid', nullable: true })
    brandId: string | null;

    @ManyToOne(() => Brand, (brand) => brand.products, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'brand_id' })
    brand: Brand | null;

    @ApiPropertyOptional({ type: () => [ProductVariant] })
    @OneToMany(() => ProductVariant, (variant) => variant.product, { cascade: ['insert'] })
    variants: ProductVariant[];

    @ApiPropertyOptional({ type: () => [ProductOption] })
    @OneToMany(() => ProductOption, (option) => option.product)
    options: ProductOption[];

    /**
     * Không phải cột DB — `ProductsService` tự gộp `thumbnail`/`images` của
     * master với `thumbnail`/`images` của TỪNG biến thể, khử trùng, chỉ tính khi
     * trả về chi tiết (nơi `variants` được nạp đủ). Response danh sách không có
     * field này vì `variants` ở đó chỉ chứa biến thể mặc định — gộp sẽ thiếu.
     */
    @ApiPropertyOptional({
        type: [String],
        description:
            'CHỈ có ở response chi tiết (GET /products/:id, /products/slug/:slug). ' +
            'Gộp ảnh master + ảnh mọi biến thể, đã khử trùng.',
    })
    galleryImages?: string[];

    /**
     * Không phải cột DB — chỉ được gắn ở `GET /admin/products` (danh sách phân
     * trang) trong `AdminVariantCountService`. Đếm biến thể chưa xoá, kể cả
     * đang tắt — cùng tập hợp mà `GET /admin/products/:id/variants` trả về.
     */
    @ApiPropertyOptional({
        default: 0,
        description: 'Số biến thể chưa xoá của sản phẩm — CHỈ có ở GET /admin/products (danh sách)',
    })
    variantCount?: number;

    get inStock(): boolean {
        return this.totalStock > 0;
    }
}
