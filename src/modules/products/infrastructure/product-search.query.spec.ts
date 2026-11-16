import { parseSearchTokens, relevanceScoreSql } from './product-search.query';

describe('parseSearchTokens', () => {
    it('tách từ theo khoảng trắng (kể cả khoảng trắng full-width), chữ thường', () => {
        expect(parseSearchTokens('i5　RTX 5060')).toEqual(['i5', 'rtx', '5060']);
    });

    it('NFKC: chữ full-width từ IME tiếng Nhật về half-width', () => {
        expect(parseSearchTokens('ＲＴＸ５０６０')).toEqual(['rtx5060']);
    });

    it('bỏ gạch nối / dấu chấm / gạch dưới trong một từ, để khớp tên viết kiểu khác', () => {
        expect(parseSearchTokens('i5-12400F')).toEqual(['i512400f']);
        expect(parseSearchTokens('DDR5・6000')).toEqual(['ddr56000']);
    });

    it('escape ký tự đại diện của LIKE để "%" không khớp mọi sản phẩm', () => {
        expect(parseSearchTokens('100%')).toEqual(['100\\%']);
        expect(parseSearchTokens('a\\b')).toEqual(['a\\\\b']);
    });

    it('bỏ từ rỗng, bỏ trùng, tối đa 8 từ', () => {
        expect(parseSearchTokens('  -  ')).toEqual([]);
        expect(parseSearchTokens(undefined)).toEqual([]);
        expect(parseSearchTokens('rtx RTX ｒｔｘ')).toEqual(['rtx']);
        expect(parseSearchTokens('a b c d e f g h i j')).toHaveLength(8);
    });
});

describe('relevanceScoreSql', () => {
    it('cộng điểm từng từ theo tham số đã gắn', () => {
        const sql = relevanceScoreSql(['rtx', '5060']);
        expect(sql).toContain(':searchToken0');
        expect(sql).toContain(':searchToken1');
        expect(relevanceScoreSql([])).toBe('0');
    });
});
