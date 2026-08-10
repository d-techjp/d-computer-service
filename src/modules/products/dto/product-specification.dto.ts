import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * Một dòng thông số kỹ thuật. Dùng chung cho create/update product —
 * `Product.specifications` lưu nguyên mảng này (JSONB), thứ tự phần tử được
 * server đồng bộ khớp với `position` nên không lệch nhau khi đọc lại.
 */
export class ProductSpecificationDto {
    @ApiProperty({ example: 'CPU' })
    @IsString()
    @MaxLength(100)
    name: string;

    @ApiProperty({ example: 'Intel Core i5-1235U' })
    @IsString()
    @MaxLength(255)
    value: string;

    @ApiPropertyOptional({
        default: 0,
        description: 'Thứ tự hiển thị — bỏ trống thì lấy theo vị trí xuất hiện trong mảng',
    })
    @Type(() => Number)
    @IsInt()
    @Min(0)
    @IsOptional()
    position?: number;
}
