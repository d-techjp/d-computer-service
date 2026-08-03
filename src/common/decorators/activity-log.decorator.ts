import { SetMetadata } from '@nestjs/common';
import type { ActivityAction } from '../../modules/activity-logs/enums/activity-action.enum';

export const ACTIVITY_LOG_KEY = 'activityLog';
export const ACTIVITY_LOG_SKIP_KEY = 'activityLogSkip';

export interface ActivityLogMetadata {
    action: ActivityAction | string;
    /** Tên tài nguyên bị tác động, ví dụ 'product', 'order'. */
    resource: string;
    /** Tên route param chứa id tài nguyên (mặc định 'id'). */
    resourceIdParam?: string;
    description?: string;
}

/** Đánh dấu handler cần ghi activity log với action/resource cụ thể. */
export const LogActivity = (metadata: ActivityLogMetadata) =>
    SetMetadata(ACTIVITY_LOG_KEY, metadata);

/** Bỏ qua ghi log cho handler này (ví dụ endpoint đọc dữ liệu nhạy cảm/ồn ào). */
export const SkipActivityLog = () => SetMetadata(ACTIVITY_LOG_SKIP_KEY, true);
