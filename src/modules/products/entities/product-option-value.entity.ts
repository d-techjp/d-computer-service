import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToMany, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ProductOption } from './product-option.entity';
import type { ProductVariant } from './product-variant.entity';

/** Một giá trị hợp lệ của option: RAM -> "16GB", Màu sắc -> "Bạc". */
@Entity('product_option_values')
@Index('uq_product_option_values_option_value', ['optionId', 'value'], { unique: true })
export class ProductOptionValue extends BaseEntity {
    @ApiProperty({ format: 'uuid' })
    @Column({ type: 'uuid' })
    optionId: string;

    @ManyToOne(() => ProductOption, (option) => option.values, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'option_id' })
    option: ProductOption;

    @ApiProperty({ example: '16GB' })
    @Column({ type: 'varchar', length: 100 })
    value: string;

    @ApiProperty({ default: 0 })
    @Column({ type: 'int', default: 0 })
    position: number;

    @ManyToMany('ProductVariant', (variant: ProductVariant) => variant.optionValues)
    variants: ProductVariant[];
}
