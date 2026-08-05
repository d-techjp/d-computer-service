import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { MAX_IMAGES_PER_REQUEST } from '../../uploads/constants/upload.constants';
import { CreateVariantDto } from './create-variant.dto';

/**
 * `optionValueIds` bị loại: đổi tổ hợp option của một biến thể đã tồn tại sẽ làm
 * lệch SKU khỏi tổ hợp đang bán. Muốn đổi thì xoá biến thể rồi tạo lại.
 */
export class UpdateVariantDto extends PartialType(OmitType(CreateVariantDto, ['optionValueIds'])) {
    /** Field Swagger-only cho multipart — xem lý do cần `@IsOptional()` ở CreateProductDto. */
    @ApiPropertyOptional({
        type: 'string',
        format: 'binary',
        description: 'Upload ảnh đại diện của biến thể lên R2, thay cho truyền URL ở `thumbnail`.',
    })
    @IsOptional()
    thumbnailFile?: unknown;

    @ApiPropertyOptional({
        type: 'array',
        items: { type: 'string', format: 'binary' },
        description: `Upload ảnh biến thể lên R2 (tối đa ${MAX_IMAGES_PER_REQUEST} file), gộp thêm vào \`images\`.`,
    })
    @IsOptional()
    imagesFiles?: unknown;
}
