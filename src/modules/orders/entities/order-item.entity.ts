import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ColumnNumericTransformer } from '../../../common/transformers/numeric.transformer';
import { ProductVariant } from '../../products/entities/product-variant.entity';
import { Product } from '../../products/entities/product.entity';
import { Order } from './order.entity';

/**
 * Snapshot hàng bán tại thời điểm đặt: tên/SKU/giá được sao chép lại để đơn cũ
 * không bị đổi nội dung khi sản phẩm gốc thay đổi hoặc bị xoá.
 *
 * Bán combo `derived_from_components` ghi thành nhiều dòng:
 * - 1 dòng cha mang variant combo và TOÀN BỘ doanh thu;
 * - N dòng con (`parentItemId` = dòng cha) cho từng component, `unitPrice = 0` —
 *   đây mới là dòng dùng để trừ/hoàn kho.
 * Combo `own_stock` chỉ có dòng cha, trừ kho ngay trên variant combo.
 */
@Entity('order_items')
@Index('idx_order_items_order', ['orderId'])
@Index('idx_order_items_parent', ['parentItemId'])
@Index('idx_order_items_variant', ['variantId'])
export class OrderItem extends BaseEntity {
    @ApiProperty({ format: 'uuid' })
    @Column({ type: 'uuid' })
    orderId: string;

    @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'order_id' })
    order: Order;

    @ApiPropertyOptional({
        format: 'uuid',
        description: 'Dòng cha khi đây là component đã bung ra từ combo',
    })
    @Column({ type: 'uuid', nullable: true })
    parentItemId: string | null;

    @ManyToOne(() => OrderItem, (item) => item.children, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'parent_item_id' })
    parentItem: OrderItem | null;

    @OneToMany(() => OrderItem, (item) => item.parentItem)
    children: OrderItem[];

    @ApiPropertyOptional({ format: 'uuid', description: 'Giữ để rollup báo cáo theo master' })
    @Column({ type: 'uuid', nullable: true })
    productId: string | null;

    @ManyToOne(() => Product, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'product_id' })
    product: Product | null;

    @ApiPropertyOptional({ format: 'uuid', description: 'Hàng thực sự được bán' })
    @Column({ type: 'uuid', nullable: true })
    variantId: string | null;

    @ManyToOne(() => ProductVariant, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'variant_id' })
    variant: ProductVariant | null;

    @ApiProperty({ example: 'Laptop Dell Vostro 3520' })
    @Column({ type: 'varchar', length: 255 })
    productName: string;

    @ApiPropertyOptional({ example: '16GB / 512GB' })
    @Column({ type: 'varchar', length: 255, nullable: true })
    variantName: string | null;

    @ApiProperty({ example: 'DELL-V3520-I5' })
    @Column({ type: 'varchar', length: 100 })
    sku: string;

    @ApiPropertyOptional()
    @Column({ type: 'varchar', length: 500, nullable: true })
    thumbnail: string | null;

    @ApiProperty({
        example: 15990000,
        description: 'Dòng component của combo = 0; doanh thu ghi ở dòng cha',
    })
    @Column({
        type: 'numeric',
        precision: 14,
        scale: 2,
        transformer: new ColumnNumericTransformer(),
    })
    unitPrice: number;

    @ApiProperty({ example: 2 })
    @Column({ type: 'int' })
    quantity: number;

    @ApiProperty({ example: 31980000, description: 'unitPrice * quantity' })
    @Column({
        type: 'numeric',
        precision: 14,
        scale: 2,
        transformer: new ColumnNumericTransformer(),
    })
    total: number;
}
