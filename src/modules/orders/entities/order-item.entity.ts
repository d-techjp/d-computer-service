import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ColumnNumericTransformer } from '../../../common/transformers/numeric.transformer';
import { Product } from '../../products/entities/product.entity';
import { Order } from './order.entity';

/**
 * Snapshot sản phẩm tại thời điểm đặt hàng: tên/SKU/giá được sao chép lại
 * để đơn cũ không bị đổi nội dung khi sản phẩm gốc thay đổi hoặc bị xoá.
 */
@Entity('order_items')
@Index('idx_order_items_order', ['orderId'])
export class OrderItem extends BaseEntity {
    @ApiProperty({ format: 'uuid' })
    @Column({ type: 'uuid' })
    orderId: string;

    @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'order_id' })
    order: Order;

    @ApiPropertyOptional({ format: 'uuid' })
    @Column({ type: 'uuid', nullable: true })
    productId: string | null;

    @ManyToOne(() => Product, (product) => product.orderItems, {
        onDelete: 'SET NULL',
        nullable: true,
    })
    @JoinColumn({ name: 'product_id' })
    product: Product | null;

    @ApiProperty({ example: 'Laptop Dell Vostro 3520' })
    @Column({ type: 'varchar', length: 255 })
    productName: string;

    @ApiProperty({ example: 'DELL-V3520-I5' })
    @Column({ type: 'varchar', length: 100 })
    sku: string;

    @ApiPropertyOptional()
    @Column({ type: 'varchar', length: 500, nullable: true })
    thumbnail: string | null;

    @ApiProperty({ example: 15990000 })
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
