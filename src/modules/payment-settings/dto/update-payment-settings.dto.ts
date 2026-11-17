import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/** Gửi đủ 5 cờ — form admin luôn có cả năm, PATCH từng phần không đáng thêm độ phức tạp. */
export class UpdatePaymentSettingsDto {
    @ApiProperty()
    @IsBoolean()
    codEnabled: boolean;

    @ApiProperty({ description: 'Gồm Visa/Mastercard/JCB/Amex, Apple Pay, Google Pay' })
    @IsBoolean()
    cardEnabled: boolean;

    @ApiProperty({ description: 'Chỉ có tác dụng khi cardEnabled = true' })
    @IsBoolean()
    cardInstallmentsEnabled: boolean;

    @ApiProperty({ description: 'Chỉ bật khi Stripe Dashboard đã duyệt PayPay' })
    @IsBoolean()
    paypayEnabled: boolean;

    @ApiProperty({ description: 'Chỉ bật khi Stripe Dashboard đã duyệt Alipay' })
    @IsBoolean()
    alipayEnabled: boolean;
}
