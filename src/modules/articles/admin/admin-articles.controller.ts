import {
    Body,
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
import { ApiOperation } from '@nestjs/swagger';
import { LogActivity } from '../../../common/decorators/activity-log.decorator';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import { PermissionCode } from '../../../common/enums/permission.enum';
import { ActivityAction } from '../../activity-logs/enums/activity-action.enum';
import { ArticlesService } from '../application/articles.service';
import { CreateArticleDto } from '../dto/create-article.dto';
import { QueryArticleDto } from '../dto/query-article.dto';
import { UpdateArticleDto } from '../dto/update-article.dto';
import { Article } from '../entities/article.entity';

@AdminController('articles', 'Articles')
@RequirePermissions(PermissionCode.ARTICLE_MANAGE)
export class AdminArticlesController {
    constructor(private readonly articlesService: ArticlesService) {}

    @Get()
    @ApiOperation({ summary: 'Danh sách bài viết mọi trạng thái' })
    findAll(@Query() query: QueryArticleDto): Promise<PaginatedResult<Article>> {
        return this.articlesService.findAll(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Chi tiết bài viết theo id' })
    findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Article> {
        return this.articlesService.findOne(id);
    }

    @Post()
    @LogActivity({ action: ActivityAction.CREATE, resource: 'article' })
    @ApiOperation({ summary: 'Tạo bài viết' })
    create(@Body() dto: CreateArticleDto, @CurrentUser('id') authorId: string): Promise<Article> {
        return this.articlesService.create(dto, authorId);
    }

    @Patch(':id')
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'article' })
    @ApiOperation({ summary: 'Cập nhật bài viết' })
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateArticleDto,
    ): Promise<Article> {
        return this.articlesService.update(id, dto);
    }

    @Patch(':id/publish')
    @LogActivity({ action: ActivityAction.PUBLISH, resource: 'article' })
    @ApiOperation({ summary: 'Xuất bản bài viết' })
    publish(@Param('id', ParseUUIDPipe) id: string): Promise<Article> {
        return this.articlesService.publish(id);
    }

    @Patch(':id/unpublish')
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'article' })
    @ApiOperation({ summary: 'Gỡ xuất bản, đưa về nháp' })
    unpublish(@Param('id', ParseUUIDPipe) id: string): Promise<Article> {
        return this.articlesService.unpublish(id);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @LogActivity({ action: ActivityAction.DELETE, resource: 'article' })
    @ApiOperation({ summary: 'Xoá mềm bài viết' })
    remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.articlesService.remove(id);
    }
}
