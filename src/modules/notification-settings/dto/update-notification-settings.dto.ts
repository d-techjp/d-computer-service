import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsEmail, MaxLength } from 'class-validator';
import { toLowerTrimmedEach } from '../../../common/transformers/transform.helpers';

export const MAX_ORDER_NOTIFY_EMAILS = 3;

export class UpdateNotificationSettingsDto {
    @ApiProperty({
        type: [String],
        example: ['order@d-techjp.com'],
        description: `Tối đa ${MAX_ORDER_NOTIFY_EMAILS} địa chỉ, thay thế toàn bộ danh sách cũ. Gửi [] để tắt`,
    })
    // Chuẩn hoá trước khi kiểm trùng, để "A@x.com" và "a@x.com " bị coi là một
    @Transform(toLowerTrimmedEach)
    @IsArray()
    @ArrayMaxSize(MAX_ORDER_NOTIFY_EMAILS, {
        message: `Chỉ nhận tối đa ${MAX_ORDER_NOTIFY_EMAILS} email thông báo`,
    })
    @ArrayUnique({ message: 'Danh sách email thông báo bị trùng' })
    @IsEmail({}, { each: true, message: 'Email thông báo không hợp lệ' })
    @MaxLength(255, { each: true })
    orderNotifyEmails: string[];
}
