import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cửa hàng có hai số: di động (cột `phone` sẵn có — giá trị trên prod là đầu 080)
 * và hotline (cột mới). Rỗng = chưa có hotline, storefront/mail/bill chỉ hiện số
 * di động như trước.
 */
export class AddSiteSettingsHotline1788000000000 implements MigrationInterface {
    name = 'AddSiteSettingsHotline1788000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "site_settings" ADD COLUMN "hotline" character varying(50) NOT NULL DEFAULT ''`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "site_settings" DROP COLUMN "hotline"`);
    }
}
