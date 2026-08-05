import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateProductDescriptionDto {
    @ApiProperty({ description: 'Nội dung mô tả chi tiết (HTML) từ rich text editor' })
    @IsString()
    content: string;
}
