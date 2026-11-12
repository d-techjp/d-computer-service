import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Liên kết đăng nhập Google cho khách storefront (`sub` của Google, duy nhất trong user còn sống). */
export class AddUserGoogleId1787500000000 implements MigrationInterface {
    name = 'AddUserGoogleId1787500000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "google_id" character varying(64)`);
        await queryRunner.query(
            `CREATE UNIQUE INDEX "uq_users_google_id" ON "users" ("google_id") WHERE "deleted_at" IS NULL`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."uq_users_google_id"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "google_id"`);
    }
}
