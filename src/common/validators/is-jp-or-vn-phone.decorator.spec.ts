import { isJpOrVnPhone } from './is-jp-or-vn-phone.decorator';

describe('isJpOrVnPhone', () => {
    it.each(['090-1234-5678', '09012345678', '03-1234-5678', '+819012345678'])(
        'nhận số Nhật %s',
        (phone) => expect(isJpOrVnPhone(phone)).toBe(true),
    );

    it.each(['0901234567', '+84901234567'])('nhận số Việt Nam %s', (phone) =>
        expect(isJpOrVnPhone(phone)).toBe(true),
    );

    it.each(['123', 'abc', '', null, 12345])('từ chối %p', (phone) =>
        expect(isJpOrVnPhone(phone)).toBe(false),
    );
});
