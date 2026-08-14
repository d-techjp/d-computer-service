import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ColumnNumericTransformer } from '../../../common/transformers/numeric.transformer';
import { ProductVariant } from '../../products/entities/product-variant.entity';
import { Cart } from './cart.entity';

/**
 * Một dòng trong giỏ. KHÔNG snapshot tên/giá/ảnh như `OrderItem` — mọi thứ đọc
 * live từ `ProductVariant` lúc trả response, nên khách luôn thấy giá hiện tại.
 * Chỉ đơn hàng mới chốt lại dữ liệu tại thời điểm đặt.
 */
@Entity('cart_items')
@Index('uq_cart_items_cart_variant', ['cartId', 'variantId'], { unique: true })
export class CartItem extends BaseEntity {
    @ApiProperty({ format: 'uuid' })
    @Column({ type: 'uuid' })
    cartId: string;

    @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'cart_id' })
    cart: Cart;

    @ApiProperty({ format: 'uuid', description: 'Biến thể được bán — không phải id sản phẩm' })
    @Column({ type: 'uuid' })
    variantId: string;

    /**
     * CASCADE chứ không SET NULL như `OrderItem.variantId`: giỏ hàng không giữ
     * bản sao nào, mất biến thể là dòng này không còn ý nghĩa gì để hiển thị.
     */
    @ManyToOne(() => ProductVariant, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'variant_id' })
    variant: ProductVariant;

    @ApiProperty({ example: 2 })
    @Column({ type: 'int' })
    quantity: number;

    /**
     * Giá tại thời điểm thêm vào giỏ. CHỈ dùng để cảnh báo "giá đã thay đổi" —
     * tuyệt đối không dùng để tính tiền, tính tiền luôn lấy `variant.price`.
     */
    @ApiProperty({ example: 15990000, description: 'Giá lúc thêm vào giỏ, chỉ để đối chiếu' })
    @Column({
        type: 'numeric',
        precision: 14,
        scale: 2,
        transformer: new ColumnNumericTransformer(),
    })
    addedUnitPrice: number;
}
