import { Controller, Get, Version, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
    HealthCheck,
    HealthCheckService,
    MemoryHealthIndicator,
    TypeOrmHealthIndicator,
    type HealthCheckResult,
} from '@nestjs/terminus';
import { Public } from '../../common/decorators/public.decorator';
import { SkipActivityLog } from '../../common/decorators/activity-log.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
    constructor(
        private readonly health: HealthCheckService,
        private readonly database: TypeOrmHealthIndicator,
        private readonly memory: MemoryHealthIndicator,
    ) {}

    @Public()
    @SkipActivityLog()
    // Không gắn version: probe của k8s/load balancer gọi thẳng /health
    @Version(VERSION_NEUTRAL)
    @Get()
    @HealthCheck()
    @ApiOperation({ summary: 'Kiểm tra tình trạng service và kết nối database' })
    check(): Promise<HealthCheckResult> {
        return this.health.check([
            () => this.database.pingCheck('database', { timeout: 3000 }),
            () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
        ]);
    }
}
