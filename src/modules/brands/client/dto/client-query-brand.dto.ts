import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Equals, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { toBoolean } from '../../../../common/transformers/transform.helpers';

/**
 * Bộ lọc storefront được phép dùng. `isActive` chỉ nhận `true` — gửi `false` sẽ
 * nhận 400 thay vì lôi được thương hiệu đã tắt ra. `ClientBrandsService` vẫn ép
 * `isActive = true` ở tầng service, nên field này thuần tuý là để FE gửi lên cho
 * tường minh, không phải là thứ quyết định phạm vi dữ liệu.
 */
export class ClientQueryBrandDto extends PaginationQueryDto {
    @ApiPropertyOptional({
        type: Boolean,
        default: true,
        description: 'Chỉ nhận `true` — storefront không xem được thương hiệu đã tắt',
    })
    @Transform(toBoolean)
    @Equals(true, { message: 'isActive chỉ nhận giá trị true' })
    @IsOptional()
    isActive?: boolean;

    @ApiPropertyOptional({ example: 'US' })
    @IsString()
    @MaxLength(100)
    @IsOptional()
    country?: string;
}
