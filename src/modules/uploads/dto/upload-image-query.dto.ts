import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UploadFolder } from '../constants/upload.constants';

export class UploadImageQueryDto {
    @ApiProperty({
        enum: UploadFolder,
        description: 'Ảnh dùng cho sản phẩm, bài viết hay video TikTok',
    })
    @IsEnum(UploadFolder)
    folder: UploadFolder;
}
