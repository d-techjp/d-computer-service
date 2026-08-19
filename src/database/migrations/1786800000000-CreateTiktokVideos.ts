import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bảng `tiktok_videos`: danh sách video TikTok gắn tay lên storefront.
 *
 * Không có slug/unique nào — cùng một video được phép gắn hai lần (ví dụ ở hai
 * đợt chiến dịch khác nhau), nên không đặt ràng buộc duy nhất trên `video_url`.
 *
 * Quyền cấp ngay tại đây, không để dành cho `npm run seed`: seedRoles bỏ qua role
 * đã tồn tại, nên trên DB đang chạy thì permission mới sẽ nằm trơ một mình và
 * chính admin cũng nhận 403 ở mọi route tiktok. Cùng lý do với `CreateCarousels`.
 */
export class CreateTiktokVideos1786800000000 implements MigrationInterface {
    name = 'CreateTiktokVideos1786800000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "tiktok_videos" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP WITH TIME ZONE,
                "video_url" character varying(500) NOT NULL,
                "thumbnail_url" character varying(500),
                "description" text,
                "sort_order" integer NOT NULL DEFAULT 0,
                "is_active" boolean NOT NULL DEFAULT true,
                CONSTRAINT "pk_tiktok_videos" PRIMARY KEY ("id")
            )
        `);

        // Truy vấn chủ đạo của storefront: video đang bật, sắp theo thứ tự hiển thị
        await queryRunner.query(
            `CREATE INDEX "idx_tiktok_videos_active_sort" ON "tiktok_videos" ("is_active", "sort_order")`,
        );

        await queryRunner.query(`
            INSERT INTO "permissions" ("code", "name", "module", "description")
            VALUES (
                'campaign.tiktok.manage',
                'Quản lý video TikTok',
                'campaign',
                'Thêm, sửa, sắp xếp, xoá video TikTok hiển thị trên storefront'
            )
            ON CONFLICT ("code") DO NOTHING
        `);

        await queryRunner.query(`
            INSERT INTO "role_permissions" ("role_id", "permission_id")
            SELECT r.id, p.id
            FROM "roles" r
            CROSS JOIN "permissions" p
            WHERE p.code = 'campaign.tiktok.manage'
                AND r.code IN ('admin', 'staff')
            ON CONFLICT DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM "permissions" WHERE "code" = 'campaign.tiktok.manage'`,
        );
        await queryRunner.query(`DROP INDEX "public"."idx_tiktok_videos_active_sort"`);
        await queryRunner.query(`DROP TABLE "tiktok_videos"`);
    }
}
