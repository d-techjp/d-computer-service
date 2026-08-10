import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Equals, IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { toBoolean } from '../../../../common/transformers/transform.helpers';

/**
 * Bộ lọc storefront được phép dùng. `isActive` chỉ nhận `true` — gửi `false` sẽ
 * nhận 400 thay vì lôi được danh mục đã tắt ra. `ClientCategoriesService` vẫn ép
 * `isActive = true` ở tầng service, nên field này thuần tuý là để FE gửi lên cho
 * tường minh, không phải là thứ quyết định phạm vi dữ liệu.
 */
export class ClientQueryCategoryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ format: 'uuid', description: 'Lọc theo danh mục cha' })
    @IsUUID()
    @IsOptional()
    parentId?: string;

    @ApiPropertyOptional({ description: 'true = chỉ lấy danh mục gốc (parentId IS NULL)' })
    @Transform(toBoolean)
    @IsBoolean()
    @IsOptional()
    rootOnly?: boolean;

    @ApiPropertyOptional({
        type: Boolean,
        default: true,
        description: 'Chỉ nhận `true` — storefront không xem được danh mục đã tắt',
    })
    @Transform(toBoolean)
    @Equals(true, { message: 'isActive chỉ nhận giá trị true' })
    @IsOptional()
    isActive?: boolean;
}
