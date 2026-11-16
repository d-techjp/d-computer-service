import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateNotificationSettingsDto } from './update-notification-settings.dto';

async function errorsOf(orderNotifyEmails: unknown): Promise<string[]> {
    const dto = plainToInstance(UpdateNotificationSettingsDto, { orderNotifyEmails });
    const errors = await validate(dto);
    return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('UpdateNotificationSettingsDto', () => {
    it('nhận tối đa 3 email, cho phép danh sách rỗng để tắt thông báo', async () => {
        expect(await errorsOf([])).toEqual([]);
        expect(await errorsOf(['a@x.com', 'b@x.com', 'c@x.com'])).toEqual([]);
        expect(await errorsOf(['a@x.com', 'b@x.com', 'c@x.com', 'd@x.com'])).toContain(
            'Chỉ nhận tối đa 3 email thông báo',
        );
    });

    it('chuẩn hoá trim + chữ thường trước khi kiểm trùng', async () => {
        const dto = plainToInstance(UpdateNotificationSettingsDto, {
            orderNotifyEmails: [' Shop@X.com '],
        });
        expect(dto.orderNotifyEmails).toEqual(['shop@x.com']);
        expect(await errorsOf(['shop@x.com', 'SHOP@x.com '])).toContain(
            'Danh sách email thông báo bị trùng',
        );
    });

    it('từ chối email sai định dạng', async () => {
        expect(await errorsOf(['khong-phai-email'])).toContain('Email thông báo không hợp lệ');
    });
});
