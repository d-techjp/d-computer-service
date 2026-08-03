import { ApiProperty } from '@nestjs/swagger';

export class UploadImageResponseDto {
    @ApiProperty({
        example: 'https://pub-xxxxxxxx.r2.dev/products/9a1c3b2e-....jpg',
        description:
            'URL công khai — gắn thẳng vào field thumbnail/images khi tạo/sửa sản phẩm hoặc bài viết',
    })
    url: string;

    @ApiProperty({
        example: 'products/9a1c3b2e-....jpg',
        description: 'Object key trong bucket R2',
    })
    key: string;

    @ApiProperty({ example: 'laptop-dell-vostro.jpg' })
    originalName: string;

    @ApiProperty({ example: 'image/jpeg' })
    mimeType: string;

    @ApiProperty({ example: 245680, description: 'Dung lượng file (byte)' })
    size: number;
}
