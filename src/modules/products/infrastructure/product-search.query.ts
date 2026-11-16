import type { SelectQueryBuilder } from 'typeorm';
import type { Product } from '../entities/product.entity';

/**
 * Tìm kiếm sản phẩm theo từ khoá, chạy thẳng trên Postgres (không cần search engine):
 *
 * - Chuẩn hoá NFKC + chữ thường ở CẢ hai phía: chữ full-width do IME tiếng Nhật gõ ra
 *   (`ＲＴＸ`) khớp với tên viết half-width.
 * - Bỏ khoảng trắng / gạch nối / dấu chấm… khi so: `RTX5060` khớp "RTX 5060",
 *   `4070ti` khớp "4070 Ti SUPER", `i5 12400f` khớp "i5-12400F".
 * - Tách từ: MỌI từ phải xuất hiện, nhưng không cần đúng thứ tự hay liền nhau
 *   (`5060 i5` vẫn ra máy "i5-14600KF / RTX 5060 Ti").
 * - Tìm trong tên, bảng thông số, mô tả ngắn, tên hãng, danh mục và SKU.
 *
 * Bảng sản phẩm chỉ vài trăm dòng nên tính biểu thức trên từng dòng là đủ nhanh;
 * khi lên hàng chục nghìn sản phẩm mới cần cột tsvector/pg_trgm có index.
 */

/** Giới hạn số từ để một chuỗi dài bất thường không sinh ra câu SQL khổng lồ. */
const MAX_TOKENS = 8;

/** Ký tự bị bỏ khi so khớp — phải giống hệt lớp ký tự trong `compact()` phía SQL. */
const SEPARATORS = /[-\s_./・･]+/g;

/**
 * Từ khoá người dùng -> danh sách từ đã chuẩn hoá, bỏ trùng, đã escape ký tự
 * đại diện của LIKE (`%`, `_`, `\`) để người dùng gõ "%" không khớp mọi thứ.
 */
export function parseSearchTokens(raw: string | undefined): string[] {
    if (!raw) return [];

    const tokens = raw
        .normalize('NFKC')
        .toLowerCase()
        .split(/\s+/)
        .map((word) => word.replace(SEPARATORS, ''))
        .filter(Boolean)
        .map((word) => word.replace(/[\\%_]/g, (char) => `\\${char}`));

    return [...new Set(tokens)].slice(0, MAX_TOKENS);
}

/** Cùng phép chuẩn hoá với `parseSearchTokens`, nhưng chạy trong Postgres. */
const compact = (expr: string): string =>
    `regexp_replace(lower(normalize(coalesce(${expr}, ''), NFKC)), '[-[:space:]_./・･]+', '', 'g')`;

const NAME = compact('product.name');

// `jsonb_typeof` chặn dữ liệu cũ không phải mảng (trước đây specs là object)
const SPECS = compact(
    "(SELECT string_agg(concat_ws(' ', spec->>'name', spec->>'value'), ' ')" +
        ' FROM jsonb_array_elements(CASE WHEN jsonb_typeof(product.specifications) = ' +
        "'array' THEN product.specifications ELSE '[]'::jsonb END) spec)",
);

const OTHERS = compact(
    "concat_ws(' ', product.shortDescription, brand.name, category.name," +
        " (SELECT string_agg(sv.sku, ' ') FROM product_variants sv" +
        ' WHERE sv.product_id = product.id AND sv.deleted_at IS NULL))',
);

const param = (index: number): string => `searchToken${index}`;

/**
 * Thêm điều kiện "mọi từ đều khớp ở đâu đó". Query phải đã join alias `brand` và
 * `category` (xem `buildSearchQuery`).
 */
export function applySearchFilter(qb: SelectQueryBuilder<Product>, tokens: string[]): void {
    tokens.forEach((token, index) => {
        const p = `:${param(index)}`;
        qb.andWhere(`(${NAME} LIKE ${p} OR ${SPECS} LIKE ${p} OR ${OTHERS} LIKE ${p})`, {
            [param(index)]: `%${token}%`,
        });
    });
}

/**
 * Điểm liên quan: mỗi từ khớp ở tên được 3, ở thông số được 2, chỗ khác được 1.
 * Dùng tham số đã gắn bởi `applySearchFilter`, nên phải gọi sau hàm đó.
 */
export function relevanceScoreSql(tokens: string[]): string {
    const terms = tokens.map((_, index) => {
        const p = `:${param(index)}`;
        return `(CASE WHEN ${NAME} LIKE ${p} THEN 3 WHEN ${SPECS} LIKE ${p} THEN 2 ELSE 1 END)`;
    });
    return terms.length > 0 ? terms.join(' + ') : '0';
}
