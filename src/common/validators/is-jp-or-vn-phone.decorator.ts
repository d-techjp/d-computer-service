import { isPhoneNumber, ValidateBy, type ValidationOptions } from 'class-validator';

/**
 * Shop ở Nhật, khách phần lớn là người Nhật và người Việt sống tại Nhật: chỉ
 * kiểm theo vùng VN thì số Nhật (090-xxxx-xxxx, 03-xxxx-xxxx) bị báo sai.
 */
export function isJpOrVnPhone(value: unknown): boolean {
    return typeof value === 'string' && (isPhoneNumber(value, 'JP') || isPhoneNumber(value, 'VN'));
}

export function IsJpOrVnPhone(options?: ValidationOptions): PropertyDecorator {
    return ValidateBy(
        {
            name: 'isJpOrVnPhone',
            validator: { validate: isJpOrVnPhone },
        },
        { message: 'Số điện thoại không hợp lệ', ...options },
    );
}
