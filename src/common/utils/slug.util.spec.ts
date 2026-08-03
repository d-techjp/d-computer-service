import { slugify } from './slug.util';

describe('slugify', () => {
    it.each([
        ['Laptop Dell Vostro 3520', 'laptop-dell-vostro-3520'],
        ['Màn hình & Máy chiếu Đỉnh cao', 'man-hinh-may-chieu-dinh-cao'],
        ['Điện thoại ĐỜI MỚI', 'dien-thoai-doi-moi'],
        ['  nhiều   khoảng   trắng  ', 'nhieu-khoang-trang'],
        ['Ký tự @#$% đặc biệt', 'ky-tu-dac-biet'],
        ['---gạch-ngang-thừa---', 'gach-ngang-thua'],
    ])('%s -> %s', (input, expected) => {
        expect(slugify(input)).toBe(expected);
    });

    it('trả chuỗi rỗng khi không còn ký tự hợp lệ', () => {
        expect(slugify('!!!')).toBe('');
    });
});
