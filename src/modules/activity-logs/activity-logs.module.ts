import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLogsController } from './activity-logs.controller';
import { ActivityLogsService } from './activity-logs.service';
import { ActivityLog } from './entities/activity-log.entity';

/**
 * Global vì ActivityLogInterceptor được đăng ký ở tầng app và mọi module
 * nghiệp vụ đều có thể cần ghi log thủ công.
 */
@Global()
@Module({
    imports: [TypeOrmModule.forFeature([ActivityLog])],
    controllers: [ActivityLogsController],
    providers: [ActivityLogsService],
    exports: [ActivityLogsService],
})
export class ActivityLogsModule {}
