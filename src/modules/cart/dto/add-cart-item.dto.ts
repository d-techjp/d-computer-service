import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsUUID, Max, Min } from 'class-validator';
import { MAX_QUANTITY_PER_ITEM } from '../enums/cart.enum';

export class AddCartItemDto {
    @ApiProperty({
        format: 'uuid',
        description:
            'Id của ProductVariant (KHÔNG phải product). Sản phẩm không có cấu hình vẫn luôn ' +
            'có sẵn một biến thể mặc định.',
    })
    @IsUUID()
    variantId: string;

    @ApiProperty({
        example: 1,
        minimum: 1,
        maximum: MAX_QUANTITY_PER_ITEM,
        description: 'Số muốn THÊM — cộng vào số đang có trong giỏ, không phải đặt lại',
    })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(MAX_QUANTITY_PER_ITEM)
    quantity: number;
}
