import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Phương thức thanh toán khách được chọn ở checkout — singleton, chỉ admin sửa
 * (`settings.manage`). Trước đây là env `STRIPE_PAYMENT_METHOD_TYPES`, phải sửa VPS
 * và restart mỗi khi Stripe duyệt thêm một phương thức.
 *
 * Mỗi cờ Stripe chỉ có tác dụng khi phương thức đó CŨNG đang bật trên Stripe
 * Dashboard: bật ở đây một loại Stripe chưa duyệt là Stripe từ chối tạo phiên.
 */
@Entity('payment_settings')
export class PaymentSettings extends BaseEntity {
    @ApiProperty({ description: 'Thanh toán khi nhận hàng (代金引換)' })
    @Column({ default: true })
    codEnabled: boolean;

    @ApiProperty({
        description: 'Thẻ qua Stripe — gồm Visa/Mastercard/JCB/Amex, Apple Pay và Google Pay',
    })
    @Column({ default: true })
    cardEnabled: boolean;

    @ApiProperty({ description: 'Cho thẻ tín dụng Nhật chọn trả góp / リボ / ボーナス払い' })
    @Column({ default: true })
    cardInstallmentsEnabled: boolean;

    @ApiProperty({ description: 'PayPay qua Stripe' })
    @Column({ default: false })
    paypayEnabled: boolean;

    @ApiProperty({ description: 'Alipay qua Stripe' })
    @Column({ default: false })
    alipayEnabled: boolean;
}
