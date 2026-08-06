import { plainToInstance, type ClassConstructor, type TransformFnParams } from 'class-transformer';

/**
 * Helper cho `@Transform(...)`. class-transformer khai báo `value` là `any`,
 * nên toàn bộ ép kiểu về `unknown` được gom vào một chỗ ở đây thay vì rải trong DTO.
 */

export const toTrimmed = ({ value }: TransformFnParams): unknown => {
    const raw: unknown = value;
    return typeof raw === 'string' ? raw.trim() : raw;
};

export const toLowerTrimmed = ({ value }: TransformFnParams): unknown => {
    const raw: unknown = value;
    return typeof raw === 'string' ? raw.trim().toLowerCase() : raw;
};

export const toUpperTrimmed = ({ value }: TransformFnParams): unknown => {
    const raw: unknown = value;
    return typeof raw === 'string' ? raw.trim().toUpperCase() : raw;
};

/** Query string luôn là chuỗi: 'true'/'false' -> boolean thật để @IsBoolean pass. */
export const toBoolean = ({ value }: TransformFnParams): unknown => {
    const raw: unknown = value;
    if (raw === 'true' || raw === true) return true;
    if (raw === 'false' || raw === false) return false;
    return raw;
};

export const toInteger = ({ value }: TransformFnParams): unknown => {
    const raw: unknown = value;
    if (typeof raw === 'number') return Math.trunc(raw);
    if (typeof raw !== 'string' || raw.trim() === '') return raw;
    return Number.parseInt(raw, 10);
};

export const toUpperCase = ({ value }: TransformFnParams): unknown => {
    const raw: unknown = value;
    return typeof raw === 'string' ? raw.toUpperCase() : raw;
};

/** Form-data chỉ gửi được chuỗi: hỗ trợ cả repeated field và JSON array string. */
export const toStringArray = ({ value }: TransformFnParams): unknown => {
    const raw: unknown = value;
    if (raw === undefined || raw === null || raw === '') return undefined;

    const parseParts = (parts: unknown[]): string[] =>
        parts
            .filter((part): part is string => typeof part === 'string')
            .map((part) => part.trim())
            .filter((part) => part.length > 0);

    if (Array.isArray(raw)) return parseParts(raw);

    if (typeof raw !== 'string') return raw;

    const trimmed = raw.trim();
    if (!trimmed) return undefined;

    try {
        const parsed: unknown = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parseParts(parsed);
    } catch {
        // Không phải JSON array thì coi là một phần tử đơn.
    }

    return [trimmed];
};

/**
 * Mảng object lồng nhau (vd `variants`, `options`) gửi qua multipart chỉ có thể
 * là JSON string — parse về mảng thật để `@ValidateNested` chạy được. JSON body
 * gửi mảng trực tiếp thì giữ nguyên.
 */
const parseJsonArray = (value: unknown): unknown => {
    const raw: unknown = value;
    if (raw === undefined || raw === null || raw === '') return undefined;
    if (typeof raw !== 'string') return raw;

    try {
        return JSON.parse(raw) as unknown;
    } catch {
        return raw; // để @IsArray báo lỗi thay vì nuốt im lặng
    }
};

export const toJsonArray = ({ value }: TransformFnParams): unknown => parseJsonArray(value);

export const toJsonArrayOf =
    <T>(target: ClassConstructor<T>) =>
    ({ value }: TransformFnParams): unknown => {
        const raw = parseJsonArray(value);
        return Array.isArray(raw) ? plainToInstance(target, raw) : raw;
    };

/** Form-data nhận object dưới dạng JSON string, JSON body thì giữ nguyên. */
export const toJsonObject = ({ value }: TransformFnParams): unknown => {
    const raw: unknown = value;
    if (raw === undefined || raw === null || raw === '') return undefined;
    if (typeof raw !== 'string') return raw;

    try {
        return JSON.parse(raw) as unknown;
    } catch {
        return raw;
    }
};

/**
 * Query nhiều giá trị trong 1 param, phân tách bằng `|` (vd `roleCode=staff|admin`)
 * -> mảng chữ thường, đã trim, bỏ phần tử rỗng. Giữ nguyên nếu đã là mảng (client
 * gửi `?roleCode=staff&roleCode=admin` thì Express tự dựng mảng trước khi tới đây).
 */
export const toLowerTrimmedArray = ({ value }: TransformFnParams): unknown => {
    const raw: unknown = value;
    const parts = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split('|') : null;
    if (!parts) return raw;

    return parts
        .filter((part): part is string => typeof part === 'string')
        .map((part) => part.trim().toLowerCase())
        .filter((part) => part.length > 0);
};
