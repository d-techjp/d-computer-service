import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID, ValidateNested } from 'class-validator';
import { CreateVariantDto } from './create-variant.dto';

/**
 * `optionValueIds` bị loại vì lý do giống `UpdateVariantDto`: đổi tổ hợp option
 * của biến thể đã tồn tại sẽ làm lệch SKU khỏi tổ hợp đang bán.
 */
export class BulkUpdateVariantItemDto extends PartialType(
    OmitType(CreateVariantDto, ['optionValueIds']),
) {
    @ApiProperty({
        format: 'uuid',
        description: 'Id biến thể cần sửa — phải thuộc sản phẩm trong URL',
    })
    @IsUUID()
    id: string;
}

/**
 * Sửa nhiều biến thể của CÙNG một sản phẩm trong một lần gọi (bảng biến thể trên
 * UI quản trị: sửa giá/kho/vị trí hàng loạt, kéo-thả sắp xếp qua `position`).
 *
 * Không nhận file ảnh — payload dạng mảng JSON không hợp với multipart. Ảnh riêng
 * của từng biến thể vẫn qua `PATCH /variants/:id`.
 */
export class BulkUpdateVariantsDto {
    @ApiProperty({ type: [BulkUpdateVariantItemDto] })
    @IsArray()
    @ArrayMinSize(1, { message: 'Cần ít nhất 1 biến thể để cập nhật' })
    @ArrayMaxSize(100)
    @ValidateNested({ each: true })
    @Type(() => BulkUpdateVariantItemDto)
    variants: BulkUpdateVariantItemDto[];
}
