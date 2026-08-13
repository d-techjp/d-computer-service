import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { toInteger } from '../../../../common/transformers/transform.helpers';

/**
 * Trang danh sách của carousel chỉ nhận phân trang — bộ lọc và thứ tự đã nằm trong
 * carousel, client không phải biết tới chúng.
 *
 * Muốn cho khách lọc thêm (facet trên PLP) thì FE lấy `filterQuery` trong response
 * rồi gọi thẳng `GET /products?<filterQuery>&<facet của khách>` — dùng lại nguyên bộ
 * lọc sẵn có của trang sản phẩm, không cần endpoint này mọc thêm một tá tham số.
 */
export class ClientCarouselProductsDto {
    @ApiPropertyOptional({ default: 1, minimum: 1 })
    @Transform(toInteger)
    @IsInt()
    @Min(1)
    @IsOptional()
    page: number = 1;

    @ApiPropertyOptional({
        default: 20,
        minimum: 1,
        maximum: 100,
        description: 'Số sản phẩm mỗi trang. Slide trang chủ thì truyền đúng số card muốn hiện.',
    })
    @Transform(toInteger)
    @IsInt()
    @Min(1)
    @Max(100)
    @IsOptional()
    limit: number = 20;
}
