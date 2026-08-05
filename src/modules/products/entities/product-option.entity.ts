import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ProductOptionValue } from './product-option-value.entity';
import { Product } from './product.entity';

/**
 * Trục biến thể của một sản phẩm (RAM, SSD, Màu sắc). Là nguồn sự thật của tổ
 * hợp biến thể — `ProductVariant.name` chỉ là nhãn hiển thị đã ghép sẵn.
 */
@Entity('product_options')
@Index('uq_product_options_product_name', ['productId', 'name'], { unique: true })
export class ProductOption extends BaseEntity {
    @ApiProperty({ format: 'uuid' })
    @Column({ type: 'uuid' })
    productId: string;

    @ManyToOne(() => Product, (product) => product.options, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'product_id' })
    product: Product;

    @ApiProperty({ example: 'RAM' })
    @Column({ type: 'varchar', length: 100 })
    name: string;

    @ApiProperty({ default: 0 })
    @Column({ type: 'int', default: 0 })
    position: number;

    @ApiPropertyOptional({ type: () => [ProductOptionValue] })
    @OneToMany(() => ProductOptionValue, (value) => value.option, { cascade: ['insert'] })
    values: ProductOptionValue[];
}
