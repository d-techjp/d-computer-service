import { ApiPropertyOptional } from '@nestjs/swagger';
import { Equals, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { ArticleStatus } from '../../entities/article.entity';

/**
 * Bộ lọc storefront được phép dùng. `status` chỉ nhận `published` — gửi `draft`
 * sẽ nhận 400 thay vì lôi được bài nháp ra. `ClientArticlesService` vẫn ép
 * `status = PUBLISHED` ở tầng service, nên field này thuần tuý là để FE gửi lên
 * cho tường minh, không phải là thứ quyết định phạm vi dữ liệu.
 */
export class ClientQueryArticleDto extends PaginationQueryDto {
    @ApiPropertyOptional({
        enum: [ArticleStatus.PUBLISHED],
        default: ArticleStatus.PUBLISHED,
        description: 'Chỉ nhận `published` — storefront không xem được bài nháp',
    })
    @Equals(ArticleStatus.PUBLISHED, { message: 'status chỉ nhận giá trị published' })
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
