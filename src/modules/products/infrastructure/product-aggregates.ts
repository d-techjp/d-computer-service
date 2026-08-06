/** Bất cứ thứ gì chạy được SQL thô: `Repository`, `EntityManager`, `QueryRunner`. */
export interface SqlExecutor {
    query(sql: string, parameters?: unknown[]): Promise<unknown>;
}

const REFRESH_AGGREGATES_SQL = `
    UPDATE "products" SET
        "min_price" = "agg"."min_price",
        "max_price" = "agg"."max_price",
        "total_stock" = "agg"."total_stock",
        "sold_count" = "agg"."sold_count",
        "has_variants" = "agg"."variant_count" > 1
    FROM (
        SELECT
            MIN("v"."price") FILTER (WHERE "v"."is_active") AS "min_price",
            MAX("v"."price") FILTER (WHERE "v"."is_active") AS "max_price",
            COALESCE(SUM("v"."stock") FILTER (
                WHERE "v"."is_active" AND "v"."track_inventory"
            ), 0) AS "total_stock",
            COALESCE(SUM("v"."sold_count"), 0) AS "sold_count",
            COUNT(*) AS "variant_count"
        FROM "product_variants" "v"
        WHERE "v"."product_id" = $1 AND "v"."deleted_at" IS NULL
    ) AS "agg"
    WHERE "products"."id" = $1
`;

const SYNC_STATUS_SQL = `
    UPDATE "products" SET "status" = CASE
        WHEN "total_stock" > 0 AND "status" = 'out_of_stock' THEN 'active'
        WHEN "total_stock" <= 0 AND "status" = 'active' AND EXISTS (
            SELECT 1 FROM "product_variants" "v"
            WHERE "v"."product_id" = "products"."id"
              AND "v"."deleted_at" IS NULL
              AND "v"."is_active" AND "v"."track_inventory"
        ) THEN 'out_of_stock'
        ELSE "status"
    END
    WHERE "id" = $1
`;

/**
 * Ghi lại các cột read-model của product (`min_price`, `max_price`,
 * `total_stock`, `sold_count`, `has_variants`) từ biến thể hiện có, rồi đồng bộ
 * `status` theo tồn kho.
 *
 * Dùng UPDATE ... FROM thay vì đọc-rồi-ghi để hai request cùng sửa biến thể của
 * một sản phẩm không ghi đè kết quả của nhau. Tách khỏi repository vì luồng đặt
 * đơn cần chạy chính logic này bên trong transaction của `OrdersUnitOfWork`.
 *
 * `has_variants` đếm cả biến thể đã tắt (vẫn là sản phẩm nhiều cấu hình); giá và
 * tồn kho chỉ tính trên biến thể đang bật. `out_of_stock` là trạng thái suy ra —
 * chỉ lật qua lại với `active`, không đụng `draft`/`archived`, và không bao giờ
 * áp cho sản phẩm không có biến thể nào theo dõi kho (dịch vụ, hàng đặt trước).
 */
export const refreshProductAggregates = async (
    executor: SqlExecutor,
    productId: string,
): Promise<void> => {
    await executor.query(REFRESH_AGGREGATES_SQL, [productId]);
    await executor.query(SYNC_STATUS_SQL, [productId]);
};
