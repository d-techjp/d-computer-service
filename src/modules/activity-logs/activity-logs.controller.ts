import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PaginatedResult } from '../../common/dto/paginated-result.dto';
import { PermissionCode } from '../../common/enums/permission.enum';
import { ActivityLogsService } from './activity-logs.service';
import { QueryActivityLogDto } from './dto/query-activity-log.dto';
import { ActivityLog } from './entities/activity-log.entity';

@ApiTags('Activity Logs')
@ApiBearerAuth()
@Controller('activity-logs')
export class ActivityLogsController {
    constructor(private readonly activityLogsService: ActivityLogsService) {}

    @Get()
    @RequirePermissions(PermissionCode.LOGS_VIEW)
    @ApiOperation({ summary: 'Tra cứu nhật ký hoạt động toàn hệ thống (admin)' })
    findAll(@Query() query: QueryActivityLogDto): Promise<PaginatedResult<ActivityLog>> {
        return this.activityLogsService.findAll(query);
    }

    @Get('me')
    @ApiOperation({ summary: 'Nhật ký hoạt động của chính mình' })
    findMine(
        @CurrentUser('id') userId: string,
        @Query() query: QueryActivityLogDto,
    ): Promise<PaginatedResult<ActivityLog>> {
        // Gán trực tiếp thay vì spread: QueryDto có getter `skip` nằm trên prototype
        query.userId = userId;
        return this.activityLogsService.findAll(query);
    }

    @Get(':id')
    @RequirePermissions(PermissionCode.LOGS_VIEW)
    @ApiOperation({ summary: 'Chi tiết một bản ghi log (admin)' })
    findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ActivityLog> {
        return this.activityLogsService.findOne(id);
    }
}
