import { toTrimmed } from '../../../common/transformers/transform.helpers';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsArray,
    IsEnum,
    IsOptional,
    IsString,
    IsUUID,
    IsUrl,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';
import { SLUG_MESSAGE, SLUG_RULE } from '../../categories/dto/create-category.dto';
import { ArticleStatus } from '../entities/article.entity';

export class CreateArticleDto {
    @ApiProperty({ example: 'Top 5 laptop văn phòng đáng mua 2026' })
    @Transform(toTrimmed)
    @IsString()
    @MinLength(5)
    @MaxLength(255)
    title: string;

    @ApiPropertyOptional({ description: 'Bỏ trống để tự sinh từ title' })
    @IsString()
    @MaxLength(300)
    @Matches(SLUG_RULE, { message: SLUG_MESSAGE })
    @IsOptional()
    slug?: string;

    @ApiPropertyOptional()
    @IsString()
    @MaxLength(500)
    @IsOptional()
    excerpt?: string;

    @ApiProperty({ description: 'Nội dung bài viết (HTML hoặc Markdown)' })
    @IsString()
    @MinLength(10)
    content: string;

    @ApiPropertyOptional({ example: 'https://cdn.dcomputer.local/articles/top-5-laptop.jpg' })
    @IsUrl()
    @MaxLength(500)
    @IsOptional()
    thumbnail?: string;

    @ApiPropertyOptional({ enum: ArticleStatus, default: ArticleStatus.DRAFT })
    @IsEnum(ArticleStatus)
    @IsOptional()
    status?: ArticleStatus;

    @ApiPropertyOptional({ type: [String], example: ['laptop', 'review'] })
    @IsArray()
    @IsString({ each: true })
    @MaxLength(50, { each: true })
    @IsOptional()
    tags?: string[];

    @ApiPropertyOptional()
    @IsString()
    @MaxLength(255)
    @IsOptional()
    metaTitle?: string;

    @ApiPropertyOptional()
    @IsString()
    @MaxLength(500)
    @IsOptional()
    metaDescription?: string;

    @ApiPropertyOptional({ format: 'uuid' })
    @IsUUID()
    @IsOptional()
    categoryId?: string;
}
