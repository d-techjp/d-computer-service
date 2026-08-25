import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { toTrimmed } from '../../../common/transformers/transform.helpers';

export class FooterLinkDto {
    @ApiPropertyOptional({
        format: 'uuid',
        description: 'Để trống khi thêm mới — server tự sinh id',
    })
    @IsString()
    @IsOptional()
    id?: string;

    @ApiProperty({ example: 'Danh sách sản phẩm' })
    @Transform(toTrimmed)
    @IsString()
    @MinLength(1)
    @MaxLength(150)
    label: string;

    // Không bắt buộc @IsUrl(): phần lớn link footer trỏ tới trang nội bộ
    // storefront (path bắt đầu bằng "/"), chỉ một số ít là link ngoài. Cũng
    // không @MinLength(1): chuỗi rỗng là giá trị hợp lệ, nghĩa là "chưa có
    // trang đích" — FE tự rơi về trang chủ khi gặp giá trị này (xem
    // `resolveFooterLinkHref` ở storefront).
    @ApiProperty({ example: '/products' })
    @IsString()
    @MaxLength(500)
    url: string;
}
