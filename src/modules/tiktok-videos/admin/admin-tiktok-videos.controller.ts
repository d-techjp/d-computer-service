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
import { TiktokVideosService } from '../application/tiktok-videos.service';
import { CreateTiktokVideoDto } from '../dto/create-tiktok-video.dto';
import { QueryTiktokVideoDto } from '../dto/query-tiktok-video.dto';
import { ReorderTiktokVideosDto } from '../dto/reorder-tiktok-videos.dto';
import { UpdateTiktokVideoDto } from '../dto/update-tiktok-video.dto';
import { TiktokVideo } from '../entities/tiktok-video.entity';

@AdminController('tiktok-videos', 'TikTok Videos')
@RequirePermissions(PermissionCode.CAMPAIGN_TIKTOK_MANAGE)
export class AdminTiktokVideosController {
    constructor(private readonly tiktokVideosService: TiktokVideosService) {}

    @Get()
    @ApiOperation({ summary: 'Danh sách video TikTok, gồm cả video đã tắt' })
    findAll(@Query() query: QueryTiktokVideoDto): Promise<PaginatedResult<TiktokVideo>> {
        return this.tiktokVideosService.findAll(query);
    }

    // Đường dẫn cố định phải đứng TRƯỚC `:id`, không thì ParseUUIDPipe nuốt mất
    @Post('reorder')
    @HttpCode(HttpStatus.NO_CONTENT)
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'tiktok_video' })
    @ApiOperation({ summary: 'Sắp xếp lại thứ tự hiển thị' })
    reorder(@Body() dto: ReorderTiktokVideosDto): Promise<void> {
        return this.tiktokVideosService.reorder(dto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Chi tiết video theo id' })
    findOne(@Param('id', ParseUUIDPipe) id: string): Promise<TiktokVideo> {
        return this.tiktokVideosService.findOne(id);
    }

    @Post()
    @LogActivity({ action: ActivityAction.CREATE, resource: 'tiktok_video' })
    @ApiOperation({
        summary: 'Thêm video TikTok',
        description: 'Bỏ trống `sortOrder` để video mới xuống cuối danh sách.',
    })
    create(@Body() dto: CreateTiktokVideoDto): Promise<TiktokVideo> {
        return this.tiktokVideosService.create(dto);
    }

    @Patch(':id')
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'tiktok_video' })
    @ApiOperation({ summary: 'Cập nhật video TikTok' })
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateTiktokVideoDto,
    ): Promise<TiktokVideo> {
        return this.tiktokVideosService.update(id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @LogActivity({ action: ActivityAction.DELETE, resource: 'tiktok_video' })
    @ApiOperation({ summary: 'Xoá mềm video TikTok' })
    remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.tiktokVideosService.remove(id);
    }
}
