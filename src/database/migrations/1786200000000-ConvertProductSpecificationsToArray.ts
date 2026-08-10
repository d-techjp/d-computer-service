import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `products.specifications` đổi từ object (`{ "CPU": "i5-1235U" }`) sang mảng có
 * thứ tự (`[{ "name": "CPU", "value": "i5-1235U", "position": 0 }]`). Cột vẫn là
 * jsonb — không đổi kiểu cột, chỉ đổi shape dữ liệu bên trong.
 *
 * Lý do đổi: object key trong jsonb của Postgres KHÔNG đảm bảo giữ thứ tự chèn
 * (hành vi được tài liệu hoá, không phải bug) nên thứ tự hiển thị thông số có
 * thể bị xáo khi đọc lại. Mảng thì Postgres giữ nguyên thứ tự phần tử.
 *
 * `position` gán theo thứ tự `jsonb_each_text` trả về cho dữ liệu cũ — thứ tự
 * đó đã là thứ tự lưu trữ nội bộ của jsonb (không nhất thiết là thứ tự admin
 * nhập ban đầu, vì thứ tự gốc coi như đã mất ngay từ lúc ghi xuống dạng object).
 * Từ migration này trở đi, thứ tự nhập vào được giữ nguyên vì lưu bằng mảng.
 */
export class ConvertProductSpecificationsToArray1786200000000 implements MigrationInterface {
    name = 'ConvertProductSpecificationsToArray1786200000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE "products" p
            SET "specifications" = sub.arr
            FROM (
                SELECT
                    src.id,
                    COALESCE(
                        jsonb_agg(
                            jsonb_build_object('name', kv.key, 'value', kv.value, 'position', kv.ord - 1)
                            ORDER BY kv.ord
                        ),
                        '[]'::jsonb
                    ) AS arr
                FROM "products" src
                CROSS JOIN LATERAL jsonb_each_text(src.specifications) WITH ORDINALITY AS kv(key, value, ord)
                WHERE src.specifications IS NOT NULL
                    AND jsonb_typeof(src.specifications) = 'object'
                GROUP BY src.id
            ) sub
            WHERE p.id = sub.id
        `);

        // Object rỗng {} không lọt qua jsonb_each_text (0 dòng -> không có trong
        // sub) nên phải xử lý riêng, chuyển thành mảng rỗng thay vì giữ nguyên {}.
        await queryRunner.query(`
            UPDATE "products"
            SET "specifications" = '[]'::jsonb
            WHERE "specifications" IS NOT NULL
                AND jsonb_typeof("specifications") = 'object'
                AND "specifications" = '{}'::jsonb
        `);
    }

    /**
     * Đảo ngược mất `position`: gộp mảng về lại object `{name: value}`. Nếu hai
     * dòng trùng `name` thì object chỉ giữ được dòng cuối — chấp nhận được vì
     * shape object gốc vốn dĩ không cho phép hai key trùng nhau.
     */
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE "products" p
            SET "specifications" = sub.obj
            FROM (
                SELECT
                    src.id,
                    COALESCE(
                        jsonb_object_agg(item->>'name', item->>'value' ORDER BY (item->>'position')::int),
                        '{}'::jsonb
                    ) AS obj
                FROM "products" src
                CROSS JOIN LATERAL jsonb_array_elements(src.specifications) AS item
                WHERE src.specifications IS NOT NULL
                    AND jsonb_typeof(src.specifications) = 'array'
                GROUP BY src.id
            ) sub
            WHERE p.id = sub.id
        `);

        await queryRunner.query(`
            UPDATE "products"
            SET "specifications" = '{}'::jsonb
            WHERE "specifications" IS NOT NULL
                AND jsonb_typeof("specifications") = 'array'
                AND "specifications" = '[]'::jsonb
        `);
    }
}
