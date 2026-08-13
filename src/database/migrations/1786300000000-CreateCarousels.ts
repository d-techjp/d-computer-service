import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bảng `carousels`: dải sản phẩm có tên + slug, nội dung do bộ lọc quyết định.
 *
 * Bộ lọc lưu hai cột song song. `filters` (jsonb) là nguồn sự thật — truy vấn sản
 * phẩm dựng từ đây. `filter_query` là chuỗi query tương ứng do server sinh, để dán
 * thẳng sang `/products?...` mà đối chiếu và để đọc log không phải parse JSON.
 * Hai cột luôn được ghi cùng lúc trong `CarouselsService`.
 *
 * Unique slug chỉ áp cho bản ghi chưa xoá (partial index) — xoá mềm rồi thì slug
 * được giải phóng để tạo lại, giống `brands` và `products`.
 */
export class CreateCarousels1786300000000 implements MigrationInterface {
    name = 'CreateCarousels1786300000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "carousels" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP WITH TIME ZONE,
                "name" character varying(150) NOT NULL,
                "slug" character varying(180) NOT NULL,
                "subtitle" character varying(255),
                "description" text,
                "image_url" character varying(500),
                "filters" jsonb NOT NULL DEFAULT '{}'::jsonb,
                "filter_query" character varying(1000) NOT NULL DEFAULT '',
                "item_limit" integer NOT NULL DEFAULT 12,
                "sort_order" integer NOT NULL DEFAULT 0,
                "is_active" boolean NOT NULL DEFAULT true,
                CONSTRAINT "pk_carousels" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(
            `CREATE UNIQUE INDEX "uq_carousels_slug" ON "carousels" ("slug") WHERE "deleted_at" IS NULL`,
        );

        // Truy vấn chủ đạo của storefront: lấy carousel đang bật, sắp theo thứ tự hiển thị
        await queryRunner.query(
            `CREATE INDEX "idx_carousels_active_sort" ON "carousels" ("is_active", "sort_order")`,
        );

        // Quyền phải cấp ngay tại đây, không để dành cho `npm run seed`: seedRoles bỏ qua
        // role đã tồn tại, nên trên DB đang chạy thì permission mới sẽ nằm trơ một mình
        // và chính admin cũng nhận 403 ở mọi route carousel.
        await queryRunner.query(`
            INSERT INTO "permissions" ("code", "name", "module", "description")
            VALUES (
                'product.carousel.manage',
                'Quản lý carousel',
                'product',
                'Tạo, sửa, xoá carousel và bộ lọc sản phẩm gắn kèm'
            )
            ON CONFLICT ("code") DO NOTHING
        `);

        await queryRunner.query(`
            INSERT INTO "role_permissions" ("role_id", "permission_id")
            SELECT r.id, p.id
            FROM "roles" r
            CROSS JOIN "permissions" p
            WHERE p.code = 'product.carousel.manage'
                AND r.code IN ('admin', 'staff')
            ON CONFLICT DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM "permissions" WHERE "code" = 'product.carousel.manage'`,
        );
        await queryRunner.query(`DROP INDEX "public"."idx_carousels_active_sort"`);
        await queryRunner.query(`DROP INDEX "public"."uq_carousels_slug"`);
        await queryRunner.query(`DROP TABLE "carousels"`);
    }
}
