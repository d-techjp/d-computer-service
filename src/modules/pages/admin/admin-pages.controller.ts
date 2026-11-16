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
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import { PermissionCode } from '../../../common/enums/permission.enum';
import { ActivityAction } from '../../activity-logs/enums/activity-action.enum';
import { PagesService } from '../application/pages.service';
import { CreatePageDto } from '../dto/create-page.dto';
import { QueryPageDto } from '../dto/query-page.dto';
import { UpdatePageDto } from '../dto/update-page.dto';
import { Page } from '../entities/page.entity';

@AdminController('pages', 'Pages')
@RequirePermissions(PermissionCode.SITE_PAGES_MANAGE)
export class AdminPagesController {
    constructor(private readonly pagesService: PagesService) {}

    @Get()
    @ApiOperation({ summary: 'Danh sách trang tĩnh mọi trạng thái (không kèm nội dung)' })
    findAll(@Query() query: QueryPageDto): Promise<PaginatedResult<Page>> {
        return this.pagesService.findAll(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Chi tiết trang tĩnh theo id' })
    findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Page> {
        return this.pagesService.findOne(id);
    }

    @Post()
    @LogActivity({ action: ActivityAction.CREATE, resource: 'page' })
    @ApiOperation({ summary: 'Tạo trang tĩnh' })
    create(@Body() dto: CreatePageDto): Promise<Page> {
        return this.pagesService.create(dto);
    }

    @Patch(':id')
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'page' })
    @ApiOperation({ summary: 'Cập nhật trang tĩnh' })
    update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePageDto): Promise<Page> {
        return this.pagesService.update(id, dto);
    }

    @Patch(':id/publish')
    @LogActivity({ action: ActivityAction.PUBLISH, resource: 'page' })
    @ApiOperation({ summary: 'Xuất bản trang tĩnh' })
    publish(@Param('id', ParseUUIDPipe) id: string): Promise<Page> {
        return this.pagesService.publish(id);
    }

    @Patch(':id/unpublish')
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'page' })
    @ApiOperation({ summary: 'Gỡ xuất bản, đưa về nháp' })
    unpublish(@Param('id', ParseUUIDPipe) id: string): Promise<Page> {
        return this.pagesService.unpublish(id);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @LogActivity({ action: ActivityAction.DELETE, resource: 'page' })
    @ApiOperation({ summary: 'Xoá mềm trang tĩnh' })
    remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.pagesService.remove(id);
    }
}
