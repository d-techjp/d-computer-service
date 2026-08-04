import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LogActivity } from '../../common/decorators/activity-log.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PaginatedResult } from '../../common/dto/paginated-result.dto';
import { PermissionCode } from '../../common/enums/permission.enum';
import { ActivityAction } from '../activity-logs/enums/activity-action.enum';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { QueryArticleDto } from './dto/query-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { Article } from './entities/article.entity';

@ApiTags('Articles')
@Controller('articles')
export class ArticlesController {
    constructor(private readonly articlesService: ArticlesService) {}

    @Public()
    @Get()
    @ApiOperation({ summary: 'Danh sách bài viết đã xuất bản (public)' })
    findPublished(@Query() query: QueryArticleDto): Promise<PaginatedResult<Article>> {
        return this.articlesService.findPublished(query);
    }

    @ApiBearerAuth()
    @Get('manage')
    @RequirePermissions(PermissionCode.ARTICLE_MANAGE)
    @ApiOperation({ summary: 'Danh sách bài viết mọi trạng thái (quản trị)' })
    findAll(@Query() query: QueryArticleDto): Promise<PaginatedResult<Article>> {
        return this.articlesService.findAll(query);
    }

    @Public()
    @Get('slug/:slug')
    @ApiOperation({ summary: 'Chi tiết bài viết theo slug, tự tăng lượt xem (public)' })
    findBySlug(@Param('slug') slug: string): Promise<Article> {
        return this.articlesService.findBySlug(slug);
    }

    @ApiBearerAuth()
    @Get(':id')
    @RequirePermissions(PermissionCode.ARTICLE_MANAGE)
    @ApiOperation({ summary: 'Chi tiết bài viết theo id (quản trị)' })
    findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Article> {
        return this.articlesService.findOne(id);
    }

    @ApiBearerAuth()
    @Post()
    @RequirePermissions(PermissionCode.ARTICLE_MANAGE)
    @LogActivity({ action: ActivityAction.CREATE, resource: 'article' })
    @ApiOperation({ summary: 'Tạo bài viết' })
    create(@Body() dto: CreateArticleDto, @CurrentUser('id') authorId: string): Promise<Article> {
        return this.articlesService.create(dto, authorId);
    }

    @ApiBearerAuth()
    @Patch(':id')
    @RequirePermissions(PermissionCode.ARTICLE_MANAGE)
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'article' })
    @ApiOperation({ summary: 'Cập nhật bài viết' })
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateArticleDto,
    ): Promise<Article> {
        return this.articlesService.update(id, dto);
    }

    @ApiBearerAuth()
    @Patch(':id/publish')
    @RequirePermissions(PermissionCode.ARTICLE_MANAGE)
    @LogActivity({ action: ActivityAction.PUBLISH, resource: 'article' })
    @ApiOperation({ summary: 'Xuất bản bài viết' })
    publish(@Param('id', ParseUUIDPipe) id: string): Promise<Article> {
        return this.articlesService.publish(id);
    }

    @ApiBearerAuth()
    @Patch(':id/unpublish')
    @RequirePermissions(PermissionCode.ARTICLE_MANAGE)
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'article' })
    @ApiOperation({ summary: 'Gỡ xuất bản, đưa về nháp' })
    unpublish(@Param('id', ParseUUIDPipe) id: string): Promise<Article> {
        return this.articlesService.unpublish(id);
    }

    @ApiBearerAuth()
    @Delete(':id')
    @RequirePermissions(PermissionCode.ARTICLE_MANAGE)
    @HttpCode(HttpStatus.NO_CONTENT)
    @LogActivity({ action: ActivityAction.DELETE, resource: 'article' })
    @ApiOperation({ summary: 'Xoá mềm bài viết' })
    remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.articlesService.remove(id);
    }
}
