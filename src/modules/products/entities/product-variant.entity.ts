import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    Column,
    Entity,
    Index,
    JoinColumn,
    JoinTable,
    ManyToMany,
    ManyToOne,
    OneToMany,
} from 'typeorm';
import { SoftDeletableEntity } from '../../../common/entities/base.entity';
import { ColumnNumericTransformer } from '../../../common/transformers/numeric.transformer';
import { ProductBundleItem } from './product-bundle-item.entity';
import { ProductOptionValue } from './product-option-value.entity';
import { Product } from './product.entity';

export enum BundleInventoryPolicy {
    /**
     * Combo không có kho riêng: tồn kho = MIN(floor(stock component / quantity)).
     * Khi bán chỉ trừ kho component — TUYỆT ĐỐI không trừ kho của chính bundle,
     * nếu không sẽ trừ kho hai lần.
     */
    DERIVED_FROM_COMPONENTS = 'derived_from_components',
    /** Kit đã đóng gói sẵn: có kho riêng ở `stock`, bán không đụng tới component. */
    OWN_STOCK = 'own_stock',
}

/**
 * Đơn vị bán được (sellable unit / SKU). Mọi FK trỏ tới "hàng được bán" —
 * order item, giỏ hàng, thành phần combo — đều trỏ vào bảng này, không trỏ
 * vào `products`.
 */
@Entity('product_variants')
@Index('idx_product_variants_product', ['productId', 'position'])
@Index('idx_product_variants_active_price', ['isActive', 'price'])
export class ProductVariant extends SoftDeletableEntity {
    @ApiProperty({ format: 'uuid' })
    @Column({ type: 'uuid' })
    productId: string;

    @ManyToOne(() => Product, (product) => product.variants, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'product_id' })
    product: Product;

    @ApiProperty({
        example: '16GB / 512GB',
        description: 'Nhãn hiển thị đã ghép sẵn; sản phẩm không có biến thể thì copy tên product',
    })
    @Column({ type: 'varchar', length: 255 })
    name: string;

    @ApiProperty({ example: 'DELL-V3520-I5-16-512' })
    @Index('uq_product_variants_sku', { unique: true, where: '"deleted_at" IS NULL' })
    @Column({ type: 'varchar', length: 100 })
    sku: string;

    @ApiPropertyOptional({ example: '8935001234567', description: 'EAN/UPC để quét mã tại quầy' })
    @Column({ type: 'varchar', length: 64, nullable: true })
    barcode: string | null;

    @ApiProperty({ example: 15990000, description: 'Giá bán (VND)' })
    @Column({
        type: 'numeric',
        precision: 14,
        scale: 2,
        transformer: new ColumnNumericTransformer(),
    })
    price: number;

    @ApiPropertyOptional({ example: 17990000, description: 'Giá gốc để hiển thị mức giảm' })
    @Column({
        type: 'numeric',
        precision: 14,
        scale: 2,
        nullable: true,
        transformer: new ColumnNumericTransformer(),
    })
    compareAtPrice: number | null;

    @ApiPropertyOptional({ example: 12000000, description: 'Giá vốn — chỉ nội bộ' })
    @Column({
        type: 'numeric',
        precision: 14,
        scale: 2,
        nullable: true,
        select: false,
        transformer: new ColumnNumericTransformer(),
    })
    costPrice: number | null;

    @ApiProperty({
        example: 25,
        description:
            'Bỏ qua khi trackInventory = false hoặc bundleInventoryPolicy = derived_from_components',
    })
    @Column({ type: 'int', default: 0 })
    stock: number;

    @ApiProperty({ example: 5, description: 'Ngưỡng cảnh báo sắp hết hàng' })
    @Column({ type: 'int', default: 0 })
    lowStockThreshold: number;

    @ApiPropertyOptional({ example: 1800, description: 'Khối lượng (gram) để tính phí vận chuyển' })
    @Column({ type: 'int', nullable: true })
    weightGrams: number | null;

    @ApiPropertyOptional({ description: 'Override ảnh của master khi biến thể khác màu/cấu hình' })
    @Column({ type: 'varchar', length: 500, nullable: true })
    thumbnail: string | null;

    @ApiPropertyOptional({ type: [String], description: 'Ảnh riêng; rỗng thì fallback về product' })
    @Column({ type: 'jsonb', nullable: true })
    images: string[] | null;

    @ApiProperty({ default: 0, description: 'Thứ tự hiển thị trong variant picker' })
    @Column({ type: 'int', default: 0 })
    position: number;

    @ApiProperty({ default: false, description: 'Biến thể hiển thị mặc định — mỗi product đúng 1' })
    @Index('uq_product_variants_default', {
        unique: true,
        where: '"is_default" = true AND "deleted_at" IS NULL',
    })
    @Column({ type: 'boolean', default: false })
    isDefault: boolean;

    @ApiProperty({ default: true, description: 'Tắt 1 biến thể mà không cần archive cả product' })
    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @ApiProperty({
        default: true,
        description: 'false cho dịch vụ / hàng đặt trước — bán được kể cả khi stock = 0',
    })
    @Column({ type: 'boolean', default: true })
    trackInventory: boolean;

    @ApiPropertyOptional({
        enum: BundleInventoryPolicy,
        description: 'CHỈ set khi product.productType = bundle; các trường hợp khác để null',
    })
    @Column({ type: 'enum', enum: BundleInventoryPolicy, nullable: true })
    bundleInventoryPolicy: BundleInventoryPolicy | null;

    @ApiProperty({ default: 0 })
    @Column({ type: 'int', default: 0 })
    soldCount: number;

    /** Các dòng thành phần khi variant này là một combo. */
    @ApiPropertyOptional({ type: () => [ProductBundleItem] })
    @OneToMany(() => ProductBundleItem, (item) => item.bundleVariant)
    bundleItems: ProductBundleItem[];

    @ApiPropertyOptional({ type: () => [ProductOptionValue] })
    @ManyToMany(() => ProductOptionValue, (value) => value.variants, { onDelete: 'CASCADE' })
    @JoinTable({
        name: 'product_variant_option_values',
        joinColumn: { name: 'variant_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'option_value_id', referencedColumnName: 'id' },
    })
    optionValues: ProductOptionValue[];

    /**
     * Còn bán được không, xét theo chính variant này. Combo
     * `derived_from_components` KHÔNG dùng getter này — tồn kho của nó phải
     * tính từ component qua `ProductBundlesService.resolveAvailability()`.
     */
    get inStock(): boolean {
        return !this.trackInventory || this.stock > 0;
    }
}
