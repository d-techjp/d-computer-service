import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Product } from './product.entity';

/**
 * Mô tả chi tiết sản phẩm (HTML, soạn bằng rich text editor — giống Article.content).
 * Tách khỏi `products.description` (chỉ dùng cho đoạn mô tả ngắn) để tránh load
 * nội dung HTML nặng mỗi lần truy vấn danh sách/sản phẩm.
 */
@Entity('product_descriptions')
export class ProductDescription extends BaseEntity {
    @ApiProperty({ format: 'uuid' })
    @Index('uq_product_descriptions_product_id', { unique: true })
    @Column({ type: 'uuid' })
    productId: string;

    @OneToOne(() => Product, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'product_id' })
    product: Product;

    @ApiProperty({ description: 'Nội dung mô tả chi tiết (HTML)' })
    @Column({ type: 'text', default: '' })
    content: string;
}
