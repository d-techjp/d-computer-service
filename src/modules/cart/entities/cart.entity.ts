import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { CartStatus } from '../enums/cart.enum';
import { CartItem } from './cart-item.entity';

/**
 * Giỏ hàng lưu ở DB. `id` chính là `cartId` trả cho client — client lưu vào
 * localStorage và gửi lại qua path param ở mọi request sau đó.
 *
 * Không soft delete: giỏ hàng là dữ liệu tạm, xoá là xoá hẳn. Giỏ đã đặt hàng
 * thì chuyển `status = converted` chứ không xoá, để còn truy vết ngược từ đơn.
 */
@Entity('carts')
@Index('idx_carts_user_status', ['userId', 'status'])
export class Cart extends BaseEntity {
    @ApiPropertyOptional({
        format: 'uuid',
        description: 'null nếu là giỏ của khách chưa đăng nhập',
    })
    @Column({ type: 'uuid', nullable: true })
    userId: string | null;

    @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'user_id' })
    user: User | null;

    @ApiProperty({ enum: CartStatus, default: CartStatus.ACTIVE })
    @Column({ type: 'enum', enum: CartStatus, default: CartStatus.ACTIVE })
    status: CartStatus;

    @ApiPropertyOptional({
        format: 'uuid',
        description: 'Đơn hàng được tạo ra từ giỏ này — chỉ để truy vết',
    })
    @Column({ type: 'uuid', nullable: true })
    orderId: string | null;

    @ApiProperty({ type: () => [CartItem] })
    @OneToMany(() => CartItem, (item) => item.cart, { cascade: ['insert'], eager: true })
    items: CartItem[];
}
