import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UploadFolder } from '../constants/upload.constants';

export class UploadImageQueryDto {
    @ApiProperty({ enum: UploadFolder, description: 'Ảnh dùng cho sản phẩm hay bài viết' })
    @IsEnum(UploadFolder)
    folder: UploadFolder;
}
