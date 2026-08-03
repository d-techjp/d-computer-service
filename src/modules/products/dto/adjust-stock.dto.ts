import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, NotEquals } from 'class-validator';

export class AdjustStockDto {
    @ApiProperty({ example: 10, description: 'Số lượng cộng thêm; dùng số âm để trừ kho' })
    @Type(() => Number)
    @IsInt()
    @NotEquals(0, { message: 'delta phải khác 0' })
    delta: number;

    @ApiPropertyOptional({ example: 'Nhập hàng lô tháng 8' })
    @IsString()
    @MaxLength(255)
    @IsOptional()
    reason?: string;
}
