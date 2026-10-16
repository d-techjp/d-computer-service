import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class QueryDashboardDto {
    @ApiPropertyOptional({
        example: '2026-10-01T00:00:00.000Z',
        description: 'Mốc đầu khoảng thống kê (tính cả mốc này). Bỏ trống = 30 ngày gần nhất.',
    })
    @IsDateString()
    @IsOptional()
    from?: string;

    @ApiPropertyOptional({
        example: '2026-10-10T23:59:59.999Z',
        description: 'Mốc cuối khoảng thống kê (tính cả mốc này). Bỏ trống = thời điểm hiện tại.',
    })
    @IsDateString()
    @IsOptional()
    to?: string;
}
