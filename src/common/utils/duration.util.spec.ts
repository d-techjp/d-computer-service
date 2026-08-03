import { parseDurationToSeconds } from './duration.util';

describe('parseDurationToSeconds', () => {
    it.each([
        ['60s', 60],
        ['15m', 900],
        ['2h', 7200],
        ['1d', 86400],
        ['1w', 604800],
        ['3600', 3600],
    ])('%s -> %d giây', (input, expected) => {
        expect(parseDurationToSeconds(input)).toBe(expected);
    });

    it('dùng fallback khi chuỗi không hợp lệ', () => {
        expect(parseDurationToSeconds('không hợp lệ', 42)).toBe(42);
    });
});
