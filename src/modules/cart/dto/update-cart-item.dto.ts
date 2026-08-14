import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { MAX_QUANTITY_PER_ITEM } from '../enums/cart.enum';

export class UpdateCartItemDto {
    @ApiProperty({
        example: 3,
        minimum: 1,
        maximum: MAX_QUANTITY_PER_ITEM,
        description: 'Số lượng TUYỆT ĐỐI cho dòng này. Muốn bỏ dòng thì dùng DELETE.',
    })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(MAX_QUANTITY_PER_ITEM)
    quantity: number;
}
