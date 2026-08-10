import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLogsService } from './activity-logs.service';
import { AdminActivityLogsController } from './admin/admin-activity-logs.controller';
import { ClientActivityLogsController } from './client/client-activity-logs.controller';
import { ActivityLogsRepository } from './domain/activity-logs.repository';
import { ActivityLog } from './entities/activity-log.entity';
import { TypeOrmActivityLogsRepository } from './infrastructure/typeorm-activity-logs.repository';

/**
 * Global vì ActivityLogInterceptor được đăng ký ở tầng app và mọi module
 * nghiệp vụ đều có thể cần ghi log thủ công.
 */
@Global()
@Module({
    imports: [TypeOrmModule.forFeature([ActivityLog])],
    controllers: [ClientActivityLogsController, AdminActivityLogsController],
    providers: [
        ActivityLogsService,
        { provide: ActivityLogsRepository, useClass: TypeOrmActivityLogsRepository },
    ],
    exports: [ActivityLogsService],
})
export class ActivityLogsModule {}
