import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { toTrimmed } from '../../../common/transformers/transform.helpers';

/** Ràng buộc giống `ShippingAddressDto` — địa chỉ lưu được thì đặt hàng được. */
export class CreateAddressDto {
    @ApiPropertyOptional({ example: '自宅', description: 'Tên gợi nhớ, tuỳ chọn' })
    @Transform(toTrimmed)
    @IsString()
    @MaxLength(50)
    @IsOptional()
    label?: string;

    @ApiProperty({ example: '山田 太郎' })
    @Transform(toTrimmed)
    @IsString()
    @MinLength(2)
    @MaxLength(150)
    fullName: string;

    @ApiProperty({ example: '090-1234-5678' })
    @Transform(toTrimmed)
    @IsString()
    @MinLength(9)
    @MaxLength(20)
    phone: string;

    @ApiProperty({ example: '大阪府' })
    @Transform(toTrimmed)
    @IsString()
    @MinLength(2)
    @MaxLength(150)
    province: string;

    @ApiPropertyOptional({ example: '大阪市浪速区' })
    @Transform(toTrimmed)
    @IsString()
    @MaxLength(150)
    @IsOptional()
    district?: string;

    @ApiPropertyOptional({ example: '日本橋' })
    @Transform(toTrimmed)
    @IsString()
    @MaxLength(150)
    @IsOptional()
    ward?: string;

    @ApiProperty({ example: '1-2-3 ○○マンション 101' })
    @Transform(toTrimmed)
    @IsString()
    @MinLength(3)
    @MaxLength(255)
    street: string;

    @ApiPropertyOptional({
        description: 'true: đặt làm mặc định. Địa chỉ đầu tiên luôn tự thành mặc định',
    })
    @IsBoolean()
    @IsOptional()
    isDefault?: boolean;
}

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
