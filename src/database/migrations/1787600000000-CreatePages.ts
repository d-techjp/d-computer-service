import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bảng `pages`: trang tĩnh storefront (`/{slug}`), quản lý ở admin → Hiển thị → Trang tĩnh.
 *
 * Unique slug chỉ áp cho bản ghi chưa xoá (partial index), giống `articles` và
 * `carousels`: xoá mềm rồi thì slug được giải phóng để tạo lại.
 */
export class CreatePages1787600000000 implements MigrationInterface {
    name = 'CreatePages1787600000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TYPE "public"."pages_status_enum" AS ENUM('draft', 'published')`,
        );
        await queryRunner.query(`
            CREATE TABLE "pages" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP WITH TIME ZONE,
                "title" character varying(255) NOT NULL,
                "slug" character varying(180) NOT NULL,
                "content" text NOT NULL,
                "status" "public"."pages_status_enum" NOT NULL DEFAULT 'draft',
                "published_at" TIMESTAMP WITH TIME ZONE,
                "meta_title" character varying(255),
                "meta_description" character varying(500),
                CONSTRAINT "pk_pages" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(
            `CREATE UNIQUE INDEX "uq_pages_slug" ON "pages" ("slug") WHERE "deleted_at" IS NULL`,
        );

        // Cấp quyền ngay trong migration (không để cho seed): seedRoles bỏ qua role đã
        // tồn tại, nên trên DB đang chạy admin sẽ nhận 403 ở mọi route trang tĩnh.
        await queryRunner.query(`
            INSERT INTO "permissions" ("code", "name", "module", "description")
            VALUES (
                'site.pages.manage',
                'Quản lý trang tĩnh',
                'campaign',
                'Tạo, sửa, xuất bản, xoá trang tĩnh (chính sách, giới thiệu…) trên storefront'
            )
            ON CONFLICT ("code") DO NOTHING
        `);
        await queryRunner.query(`
            INSERT INTO "role_permissions" ("role_id", "permission_id")
            SELECT r.id, p.id
            FROM "roles" r
            CROSS JOIN "permissions" p
            WHERE p.code = 'site.pages.manage'
                AND r.code IN ('admin', 'staff')
            ON CONFLICT DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "permissions" WHERE "code" = 'site.pages.manage'`);
        await queryRunner.query(`DROP INDEX "public"."uq_pages_slug"`);
        await queryRunner.query(`DROP TABLE "pages"`);
        await queryRunner.query(`DROP TYPE "public"."pages_status_enum"`);
    }
}
