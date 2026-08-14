import { toTrimmed } from '../../../common/transformers/transform.helpers';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsDefined,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    Min,
    MinLength,
    ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../enums/order.enum';

export class OrderItemInputDto {
    @ApiProperty({
        format: 'uuid',
        description:
            'Id của ProductVariant (KHÔNG phải product). Sản phẩm không có biến thể thì dùng ' +
            'variant mặc định — có sẵn trong `variants[0]` của mọi response product.',
    })
    @IsUUID()
    variantId: string;

    @ApiProperty({ example: 2, minimum: 1 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    quantity: number;
}

export class ShippingAddressDto {
    @ApiProperty({ example: 'Nguyễn Văn A' })
    @Transform(toTrimmed)
    @IsString()
    @MinLength(2)
    @MaxLength(150)
    fullName: string;

    @ApiProperty({ example: '0901234567' })
    @IsString()
    @MinLength(9)
    @MaxLength(20)
    phone: string;

    @ApiProperty({ example: '123 Nguyễn Huệ' })
    @IsString()
    @MinLength(3)
    @MaxLength(255)
    street: string;

    @ApiPropertyOptional({ example: 'Phường Bến Nghé' })
    @IsString()
    @MaxLength(150)
    @IsOptional()
    ward?: string;

    @ApiPropertyOptional({ example: 'Quận 1' })
    @IsString()
    @MaxLength(150)
    @IsOptional()
    district?: string;

    @ApiProperty({ example: 'TP. Hồ Chí Minh' })
    @IsString()
    @MinLength(2)
    @MaxLength(150)
    province: string;

    @ApiPropertyOptional()
    @IsString()
    @MaxLength(255)
    @IsOptional()
    note?: string;
}

export class CreateOrderDto {
    @ApiProperty({ type: [OrderItemInputDto] })
    @IsArray()
    @ArrayMinSize(1, { message: 'Đơn hàng phải có ít nhất 1 sản phẩm' })
    @ArrayMaxSize(100)
    @ValidateNested({ each: true })
    @Type(() => OrderItemInputDto)
    items: OrderItemInputDto[];

    // `@IsDefined()` là bắt buộc: `@ValidateNested()` bỏ qua giá trị `undefined`
    // nên thiếu hẳn `shippingAddress` sẽ lọt qua validation, rồi mới vỡ ở tầng DB
    // (cột `shipping_address` NOT NULL) thành lỗi 500 khó hiểu.
    @ApiProperty({ type: ShippingAddressDto })
    @IsDefined({ message: 'Vui lòng nhập địa chỉ giao hàng' })
    @ValidateNested()
    @Type(() => ShippingAddressDto)
    shippingAddress: ShippingAddressDto;

    @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.COD })
    @IsEnum(PaymentMethod)
    @IsOptional()
    paymentMethod?: PaymentMethod;

    // KHÔNG có `discount`/`shippingFee` ở đây: hai số này quyết định số tiền phải
    // trả nên phải do server tính. Trước đây client gửi thẳng lên và chỉ bị chặn
    // bởi `discount > subtotal`, tức khách tự giảm giá đơn của mình xuống gần 0.
    // Truyền qua tham số `pricing` của `OrdersService.create` thay vì qua DTO.
    // `forbidNonWhitelisted` của ValidationPipe tự trả 400 nếu client còn gửi.

    @ApiPropertyOptional()
    @IsString()
    @MaxLength(500)
    @IsOptional()
    note?: string;
}
