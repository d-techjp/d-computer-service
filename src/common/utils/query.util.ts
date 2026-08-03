/**
 * Chỉ cho phép sắp xếp theo các cột nằm trong allowlist — chặn SQL injection
 * qua query param `sortBy` khi ghép vào QueryBuilder.
 */
export const resolveSortColumn = (
    requested: string | undefined,
    allowed: readonly string[],
    fallback: string,
): string => (requested && allowed.includes(requested) ? requested : fallback);
