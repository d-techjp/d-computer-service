import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ProductVariant } from './product-variant.entity';

/**
 * Một dòng thành phần của combo: "combo X gồm 2 chiếc Y".
 *
 * `componentVariantId` dùng RESTRICT chứ không CASCADE — không cho xoá một
 * variant đang là thành phần của combo nào đó, nếu không combo sẽ âm thầm
 * thiếu hàng mà không ai biết.
 */
@Entity('product_bundle_items')
@Index('uq_product_bundle_items_pair', ['bundleVariantId', 'componentVariantId'], { unique: true })
@Index('idx_product_bundle_items_component', ['componentVariantId'])
export class ProductBundleItem extends BaseEntity {
    @ApiProperty({ format: 'uuid', description: 'Variant của product có productType = bundle' })
    @Column({ type: 'uuid' })
    bundleVariantId: string;

    @ManyToOne(() => ProductVariant, (variant) => variant.bundleItems, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'bundle_variant_id' })
    bundleVariant: ProductVariant;

    @ApiProperty({
        format: 'uuid',
        description: 'Variant của product standard — không cho phép combo lồng combo',
    })
    @Column({ type: 'uuid' })
    componentVariantId: string;

    @ManyToOne(() => ProductVariant, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'component_variant_id' })
    componentVariant: ProductVariant;

    @ApiProperty({ example: 2, description: 'Số lượng component trong 1 combo' })
    @Column({ type: 'int', default: 1 })
    quantity: number;

    @ApiProperty({ default: 0 })
    @Column({ type: 'int', default: 0 })
    position: number;

    @ApiProperty({
        default: false,
        description:
            'true = quà tặng kèm, KHÔNG tính vào công thức tồn kho derived_from_components',
    })
    @Column({ type: 'boolean', default: false })
    isOptional: boolean;
}
