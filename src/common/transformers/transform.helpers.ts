import type { TransformFnParams } from 'class-transformer';

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
