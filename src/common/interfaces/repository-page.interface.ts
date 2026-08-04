/**
 * Kết quả phân trang thô từ tầng persistence — mọi repository port trả về
 * dạng này thay vì `PaginatedResult` (dựng ở tầng service, vì `meta` cần
 * `page`/`limit` mà repository không cần biết).
 */
export interface RepositoryPage<T> {
    items: T[];
    total: number;
}
