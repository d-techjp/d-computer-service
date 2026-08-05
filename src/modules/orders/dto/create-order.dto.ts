import { toTrimmed } from '../../../common/transformers/transform.helpers';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsEnum,
    IsInt,
    IsNumber,
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

    @ApiProperty({ type: ShippingAddressDto })
    @ValidateNested()
    @Type(() => ShippingAddressDto)
    shippingAddress: ShippingAddressDto;

    @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.COD })
    @IsEnum(PaymentMethod)
    @IsOptional()
    paymentMethod?: PaymentMethod;

    @ApiPropertyOptional({ example: 30000, default: 0 })
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @IsOptional()
    shippingFee?: number;

    @ApiPropertyOptional({ example: 0, default: 0, description: 'Số tiền giảm giá' })
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @IsOptional()
    discount?: number;

    @ApiPropertyOptional()
    @IsString()
    @MaxLength(500)
    @IsOptional()
    note?: string;
}
