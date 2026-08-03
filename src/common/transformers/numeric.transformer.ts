import type { ValueTransformer } from 'typeorm';

/**
 * Driver `pg` trả cột numeric/decimal về dạng string để không mất độ chính xác.
 * Transformer này đưa về `number` cho tầng ứng dụng — chấp nhận được với
 * giá trị tiền tệ trong phạm vi an toàn của double (< 2^53).
 */
export class ColumnNumericTransformer implements ValueTransformer {
    to(value: number | null | undefined): number | null {
        return value ?? null;
    }

    from(value: string | number | null): number | null {
        if (value === null || value === undefined) return null;
        return typeof value === 'number' ? value : Number.parseFloat(value);
    }
}
