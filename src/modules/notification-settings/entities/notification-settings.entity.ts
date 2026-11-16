import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Cấu hình thông báo nội bộ của shop — singleton giống `site_settings`, nhưng tách
 * bảng riêng vì đây là dữ liệu vận hành (khách không thấy) và chỉ admin được sửa:
 * nhân viên có quyền "thông tin cửa hàng" mà đổi được hộp thư nhận đơn thì chủ
 * shop có thể không còn nhận báo đơn mới.
 */
@Entity('notification_settings')
export class NotificationSettings extends BaseEntity {
    @ApiProperty({
        type: [String],
        example: ['order@d-techjp.com'],
        description: 'Hộp thư nhận email báo đơn mới (tối đa 3). Rỗng = không gửi',
    })
    @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
    orderNotifyEmails: string[];
}
