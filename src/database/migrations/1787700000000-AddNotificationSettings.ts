import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Chuyển hai email đang nằm trong env (`MAIL_REPLY_TO`, `SHOP_NOTIFY_EMAILS`) vào DB
 * để sửa được trong admin:
 * - `site_settings.support_email`: email hỗ trợ công khai (Reply-To + footer mail),
 *   sửa ở Hiển thị → Thông tin cửa hàng.
 * - bảng `notification_settings`: hộp thư nhận báo đơn mới, sửa ở Cài đặt → Thông
 *   báo, quyền riêng `settings.manage` chỉ cấp cho admin.
 */
export class AddNotificationSettings1787700000000 implements MigrationInterface {
    name = 'AddNotificationSettings1787700000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "site_settings" ADD COLUMN "support_email" character varying(255) NOT NULL DEFAULT ''`,
        );
        // Giữ nguyên Reply-To đang dùng trên prod (giá trị MAIL_REPLY_TO cũ, là địa chỉ
        // công khai), để mail gửi khách không mất Reply-To ngay sau khi deploy.
        await queryRunner.query(
            `UPDATE "site_settings" SET "support_email" = 'support@d-techjp.com' WHERE "support_email" = ''`,
        );

        await queryRunner.query(`
            CREATE TABLE "notification_settings" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "order_notify_emails" jsonb NOT NULL DEFAULT '[]'::jsonb,
                CONSTRAINT "pk_notification_settings" PRIMARY KEY ("id")
            )
        `);

        // Chỉ admin: nhân viên đổi được hộp thư nhận đơn thì chủ shop có thể mất thông báo
        await queryRunner.query(`
            INSERT INTO "permissions" ("code", "name", "module", "description")
            VALUES (
                'settings.manage',
                'Quản lý cài đặt hệ thống',
                'system',
                'Sửa cấu hình vận hành: hộp thư nhận email báo đơn mới'
            )
            ON CONFLICT ("code") DO NOTHING
        `);
        await queryRunner.query(`
            INSERT INTO "role_permissions" ("role_id", "permission_id")
            SELECT r.id, p.id
            FROM "roles" r
            CROSS JOIN "permissions" p
            WHERE p.code = 'settings.manage'
                AND r.code = 'admin'
            ON CONFLICT DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "permissions" WHERE "code" = 'settings.manage'`);
        await queryRunner.query(`DROP TABLE "notification_settings"`);
        await queryRunner.query(`ALTER TABLE "site_settings" DROP COLUMN "support_email"`);
    }
}
