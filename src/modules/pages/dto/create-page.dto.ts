import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { toTrimmed } from '../../../common/transformers/transform.helpers';
import { SLUG_MESSAGE, SLUG_RULE } from '../../categories/dto/create-category.dto';
import { PageStatus } from '../entities/page.entity';

export class CreatePageDto {
    @ApiProperty({ example: 'プライバシーポリシー' })
    @Transform(toTrimmed)
    @IsString()
    @MinLength(2)
    @MaxLength(255)
    title: string;

    /**
     * Bắt buộc, không tự sinh từ title như bài viết: title tiếng Nhật slugify ra
     * chuỗi rỗng, và URL trang tĩnh nằm trong footer nên phải do người nhập chủ động.
     */
    @ApiProperty({ example: 'privacy', description: 'Đường dẫn trên storefront: /{slug}' })
    @Transform(toTrimmed)
    @IsString()
    @MaxLength(180)
    @Matches(SLUG_RULE, { message: SLUG_MESSAGE })
    slug: string;

    @ApiProperty({ description: 'Nội dung HTML từ editor' })
    @IsString()
    @MinLength(10)
    content: string;

    @ApiPropertyOptional({ enum: PageStatus, default: PageStatus.DRAFT })
    @IsEnum(PageStatus)
    @IsOptional()
    status?: PageStatus;

    @ApiPropertyOptional()
    @Transform(toTrimmed)
    @IsString()
    @MaxLength(255)
    @IsOptional()
    metaTitle?: string;

    @ApiPropertyOptional()
    @Transform(toTrimmed)
    @IsString()
    @MaxLength(500)
    @IsOptional()
    metaDescription?: string;
}
