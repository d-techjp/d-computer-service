import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { SoftDeletableEntity } from '../../../common/entities/base.entity';
import { ColumnNumericTransformer } from '../../../common/transformers/numeric.transformer';
import { Brand } from '../../brands/entities/brand.entity';
import { Category } from '../../categories/entities/category.entity';
import { OrderItem } from '../../orders/entities/order-item.entity';

export enum ProductStatus {
    DRAFT = 'draft',
    ACTIVE = 'active',
    OUT_OF_STOCK = 'out_of_stock',
    ARCHIVED = 'archived',
}

@Entity('products')
@Index('idx_products_category_status', ['categoryId', 'status'])
export class Product extends SoftDeletableEntity {
    @ApiProperty({ example: 'Laptop Dell Vostro 3520' })
    @Column({ type: 'varchar', length: 255 })
    name: string;

    @ApiProperty({ example: 'laptop-dell-vostro-3520' })
    @Index('uq_products_slug', { unique: true, where: '"deleted_at" IS NULL' })
    @Column({ type: 'varchar', length: 300 })
    slug: string;

    @ApiProperty({ example: 'DELL-V3520-I5' })
    @Index('uq_products_sku', { unique: true, where: '"deleted_at" IS NULL' })
    @Column({ type: 'varchar', length: 100 })
    sku: string;

    @ApiPropertyOptional()
    @Column({ type: 'varchar', length: 500, nullable: true })
    shortDescription: string | null;

    @ApiPropertyOptional()
    @Column({ type: 'text', nullable: true })
    description: string | null;

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

    @ApiProperty({ example: 25 })
    @Column({ type: 'int', default: 0 })
    stock: number;

    @ApiProperty({ example: 5, description: 'Ngưỡng cảnh báo sắp hết hàng' })
    @Column({ type: 'int', default: 0 })
    lowStockThreshold: number;

    @ApiPropertyOptional()
    @Column({ type: 'varchar', length: 500, nullable: true })
    thumbnail: string | null;

    @ApiPropertyOptional({ type: [String] })
    @Column({ type: 'jsonb', nullable: true })
    images: string[] | null;

    @ApiPropertyOptional({
        description: 'Thông số kỹ thuật dạng key-value, ví dụ { "CPU": "i5-1235U" }',
    })
    @Column({ type: 'jsonb', nullable: true })
    specifications: Record<string, string> | null;

    @ApiProperty({ enum: ProductStatus, default: ProductStatus.DRAFT })
    @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.DRAFT })
    status: ProductStatus;

    @ApiProperty({ default: false })
    @Column({ type: 'boolean', default: false })
    isFeatured: boolean;

    @ApiProperty({ default: 0, description: 'Lượt xem' })
    @Column({ type: 'int', default: 0 })
    viewCount: number;

    @ApiProperty({ default: 0, description: 'Số lượng đã bán' })
    @Column({ type: 'int', default: 0 })
    soldCount: number;

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

    @OneToMany(() => OrderItem, (item) => item.product)
    orderItems: OrderItem[];

    get inStock(): boolean {
        return this.stock > 0;
    }
}
