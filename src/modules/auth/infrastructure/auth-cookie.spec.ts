import type { Request } from 'express';
import { extractTokenFromCookie } from './auth-cookie';

const requestWith = (cookie?: string) => ({ headers: { cookie } }) as unknown as Request;

describe('extractTokenFromCookie', () => {
    it('đọc đúng cookie phiên giữa các cookie khác', () => {
        expect(extractTokenFromCookie(requestWith('a=1; dcs_session=abc.def.ghi; b=2'))).toBe(
            'abc.def.ghi',
        );
    });

    it('không nhầm cookie có tên chứa tên phiên', () => {
        expect(extractTokenFromCookie(requestWith('old_dcs_session=x'))).toBeNull();
    });

    it('trả null khi không có cookie hoặc giá trị rỗng', () => {
        expect(extractTokenFromCookie(requestWith())).toBeNull();
        expect(extractTokenFromCookie(requestWith('dcs_session='))).toBeNull();
    });
});
