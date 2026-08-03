import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { SoftDeletableEntity } from '../../../common/entities/base.entity';
import { ColumnNumericTransformer } from '../../../common/transformers/numeric.transformer';
import { User } from '../../users/entities/user.entity';
import { OrderStatus, PaymentMethod, PaymentStatus } from '../enums/order.enum';
import { OrderItem } from './order-item.entity';

export interface ShippingAddress {
    fullName: string;
    phone: string;
    /** Số nhà, tên đường */
    street: string;
    ward?: string;
    district?: string;
    province: string;
    note?: string;
}

const money = {
    type: 'numeric' as const,
    precision: 14,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
};

@Entity('orders')
@Index('idx_orders_user_status', ['userId', 'status'])
@Index('idx_orders_created_at', ['createdAt'])
export class Order extends SoftDeletableEntity {
    @ApiProperty({ example: 'DH20260802-0001', description: 'Mã đơn hiển thị cho khách' })
    @Index('uq_orders_code', { unique: true })
    @Column({ type: 'varchar', length: 32 })
    code: string;

    @ApiPropertyOptional({ format: 'uuid', description: 'null nếu đặt hàng không cần tài khoản' })
    @Column({ type: 'uuid', nullable: true })
    userId: string | null;

    @ManyToOne(() => User, (user) => user.orders, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'user_id' })
    user: User | null;

    @ApiProperty({ enum: OrderStatus, default: OrderStatus.PENDING })
    @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
    status: OrderStatus;

    @ApiProperty({ enum: PaymentStatus, default: PaymentStatus.UNPAID })
    @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.UNPAID })
    paymentStatus: PaymentStatus;

    @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.COD })
    @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.COD })
    paymentMethod: PaymentMethod;

    @ApiProperty({ example: 31980000, description: 'Tổng tiền hàng trước giảm giá và phí ship' })
    @Column(money)
    subtotal: number;

    @ApiProperty({ example: 0 })
    @Column(money)
    discount: number;

    @ApiProperty({ example: 30000 })
    @Column(money)
    shippingFee: number;

    @ApiProperty({ example: 32010000, description: 'subtotal - discount + shippingFee' })
    @Column(money)
    total: number;

    @ApiProperty({ description: 'Địa chỉ giao hàng (snapshot tại thời điểm đặt)' })
    @Column({ type: 'jsonb' })
    shippingAddress: ShippingAddress;

    @ApiPropertyOptional()
    @Column({ type: 'varchar', length: 500, nullable: true })
    note: string | null;

    @ApiPropertyOptional({ description: 'Lý do huỷ đơn' })
    @Column({ type: 'varchar', length: 500, nullable: true })
    cancelReason: string | null;

    @ApiPropertyOptional()
    @Column({ type: 'timestamptz', nullable: true })
    confirmedAt: Date | null;

    @ApiPropertyOptional()
    @Column({ type: 'timestamptz', nullable: true })
    completedAt: Date | null;

    @ApiPropertyOptional()
    @Column({ type: 'timestamptz', nullable: true })
    cancelledAt: Date | null;

    @ApiProperty({ type: () => [OrderItem] })
    @OneToMany(() => OrderItem, (item) => item.order, { cascade: ['insert'], eager: true })
    items: OrderItem[];
}
