import { Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import { PermissionCode } from '../../../common/enums/permission.enum';
import { ActivityLogsService } from '../activity-logs.service';
import { QueryActivityLogDto } from '../dto/query-activity-log.dto';
import { ActivityLog } from '../entities/activity-log.entity';

@AdminController('activity-logs', 'Activity Logs')
@RequirePermissions(PermissionCode.LOGS_VIEW)
export class AdminActivityLogsController {
    constructor(private readonly activityLogsService: ActivityLogsService) {}

    @Get()
    @ApiOperation({ summary: 'Tra cứu nhật ký hoạt động toàn hệ thống' })
    findAll(@Query() query: QueryActivityLogDto): Promise<PaginatedResult<ActivityLog>> {
        return this.activityLogsService.findAll(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Chi tiết một bản ghi log' })
    findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ActivityLog> {
        return this.activityLogsService.findOne(id);
    }
}
