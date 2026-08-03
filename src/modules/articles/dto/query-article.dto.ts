import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ArticleStatus } from '../entities/article.entity';

export class QueryArticleDto extends PaginationQueryDto {
    @ApiPropertyOptional({ enum: ArticleStatus })
    @IsEnum(ArticleStatus)
    @IsOptional()
    status?: ArticleStatus;

    @ApiPropertyOptional({ format: 'uuid' })
    @IsUUID()
    @IsOptional()
    categoryId?: string;

    @ApiPropertyOptional({ format: 'uuid' })
    @IsUUID()
    @IsOptional()
    authorId?: string;

    @ApiPropertyOptional({ example: 'laptop', description: 'Lọc bài viết chứa tag này' })
    @IsString()
    @MaxLength(50)
    @IsOptional()
    tag?: string;
}
