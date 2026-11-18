import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Sổ địa chỉ của khách — cùng khuôn với `ShippingAddressDto` của đơn hàng để
 * checkout dùng thẳng. Mỗi khách luôn có đúng MỘT địa chỉ mặc định khi sổ không
 * rỗng; index unique một phần ở DB chặn hai dòng `is_default` cùng lúc.
 */
@Entity('customer_addresses')
@Index('idx_customer_addresses_user', ['userId'])
export class CustomerAddress extends BaseEntity {
    @Column({ type: 'uuid' })
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn()
    user?: User;

    @ApiPropertyOptional({ example: '自宅', nullable: true })
    @Column({ type: 'varchar', length: 50, nullable: true })
    label: string | null;

    @ApiProperty({ example: '山田 太郎' })
    @Column({ type: 'varchar', length: 150 })
    fullName: string;

    @ApiProperty({ example: '090-1234-5678' })
    @Column({ type: 'varchar', length: 20 })
    phone: string;

    @ApiProperty({ example: '大阪府' })
    @Column({ type: 'varchar', length: 150 })
    province: string;

    @ApiPropertyOptional({ example: '大阪市浪速区', nullable: true })
    @Column({ type: 'varchar', length: 150, nullable: true })
    district: string | null;

    @ApiPropertyOptional({ example: '日本橋', nullable: true })
    @Column({ type: 'varchar', length: 150, nullable: true })
    ward: string | null;

    @ApiProperty({ example: '1-2-3 ○○マンション 101' })
    @Column({ type: 'varchar', length: 255 })
    street: string;

    @ApiProperty()
    @Column({ default: false })
    isDefault: boolean;
}
