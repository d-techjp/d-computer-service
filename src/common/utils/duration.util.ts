const UNIT_SECONDS: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    w: 604800,
    y: 31536000,
};

/**
 * Đổi chuỗi thời hạn kiểu JWT ("60s", "15m", "1d", "3600") sang số giây.
 * Trả về `fallback` nếu chuỗi không hợp lệ.
 */
export const parseDurationToSeconds = (value: string, fallback = 3600): number => {
    const match = /^(\d+(?:\.\d+)?)\s*(s|m|h|d|w|y)?$/i.exec(value.trim());
    if (!match) return fallback;

    const amount = Number.parseFloat(match[1]);
    const unit = match[2]?.toLowerCase() ?? 's';
    return Math.floor(amount * (UNIT_SECONDS[unit] ?? 1));
};
