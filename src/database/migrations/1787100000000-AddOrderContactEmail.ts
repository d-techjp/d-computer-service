import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderContactEmail1787100000000 implements MigrationInterface {
    name = 'AddOrderContactEmail1787100000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // `customer_email` nullable: đơn cũ đặt khi checkout chưa hỏi email. Đơn có
        // tài khoản thì lấy tạm email tài khoản để chúng vẫn nhận được thông báo
        // đổi trạng thái; khách vãng lai cũ thì không có cách nào biết.
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD COLUMN "customer_email" character varying(255),
            ADD COLUMN "locale" character varying(5) NOT NULL DEFAULT 'ja'
        `);
        await queryRunner.query(`
            UPDATE "orders" o
            SET "customer_email" = u."email"
            FROM "users" u
            WHERE o."user_id" = u."id" AND o."customer_email" IS NULL AND u."email" IS NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "orders"
            DROP COLUMN "locale",
            DROP COLUMN "customer_email"
        `);
    }
}
