import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import { ActivityLogsService } from '../activity-logs.service';
import { QueryActivityLogDto } from '../dto/query-activity-log.dto';
import { ActivityLog } from '../entities/activity-log.entity';

/** Người dùng tra nhật ký của chính mình. Tra toàn hệ thống nằm ở `/admin/activity-logs`. */
@ApiTags('Activity Logs')
@ApiBearerAuth()
@Controller('activity-logs')
export class ClientActivityLogsController {
    constructor(private readonly activityLogsService: ActivityLogsService) {}

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
}
