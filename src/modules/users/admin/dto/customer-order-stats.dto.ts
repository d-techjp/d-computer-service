import { ApiProperty } from '@nestjs/swagger';

/** Tổng hợp tại thời điểm gọi — không lưu sẵn trên user. */
export class CustomerOrderStatsDto {
    @ApiProperty({
        example: 12,
        description: 'Số đơn đã đặt (không tính đơn online chưa trả tiền)',
    })
    orderCount: number;

    @ApiProperty({ example: 10 })
    completedCount: number;

    @ApiProperty({ example: 1 })
    cancelledCount: number;

    @ApiProperty({ example: 245000, description: 'Tổng tiền các đơn hoàn tất (yên)' })
    totalSpent: number;

    @ApiProperty({
        example: 24500,
        description: 'totalSpent / completedCount, 0 nếu chưa có đơn hoàn tất',
    })
    averageOrderValue: number;

    @ApiProperty({ nullable: true })
    firstOrderAt: Date | null;

    @ApiProperty({ nullable: true })
    lastOrderAt: Date | null;
}
