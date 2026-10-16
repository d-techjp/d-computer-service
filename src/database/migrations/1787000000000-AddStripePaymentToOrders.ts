import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStripePaymentToOrders1787000000000 implements MigrationInterface {
    name = 'AddStripePaymentToOrders1787000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ADD VALUE chạy được trong transaction từ PG 12 (đang dùng PG 17), miễn là
        // giá trị mới chưa được dùng trong chính transaction này.
        await queryRunner.query(
            `ALTER TYPE "public"."orders_status_enum" ADD VALUE IF NOT EXISTS 'awaiting_payment' BEFORE 'pending'`,
        );
        await queryRunner.query(
            `ALTER TYPE "public"."orders_payment_method_enum" ADD VALUE IF NOT EXISTS 'stripe'`,
        );
        await queryRunner.query(`
            ALTER TABLE "orders"
            ADD COLUMN "paid_at" TIMESTAMP WITH TIME ZONE,
            ADD COLUMN "stripe_checkout_session_id" character varying(255),
            ADD COLUMN "stripe_payment_intent_id" character varying(255)
        `);
        await queryRunner.query(
            `CREATE UNIQUE INDEX "uq_orders_stripe_checkout_session_id" ON "orders" ("stripe_checkout_session_id")`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."uq_orders_stripe_checkout_session_id"`);
        await queryRunner.query(`
            ALTER TABLE "orders"
            DROP COLUMN "stripe_payment_intent_id",
            DROP COLUMN "stripe_checkout_session_id",
            DROP COLUMN "paid_at"
        `);
        // Postgres không xoá được một giá trị khỏi enum — phải dựng lại type. Đơn
        // còn mang giá trị mới thì đổi về giá trị gần nghĩa nhất trước.
        await queryRunner.query(
            `UPDATE "orders" SET "status" = 'cancelled' WHERE "status" = 'awaiting_payment'`,
        );
        await queryRunner.query(
            `UPDATE "orders" SET "payment_method" = 'credit_card' WHERE "payment_method" = 'stripe'`,
        );

        await queryRunner.query(
            `ALTER TYPE "public"."orders_status_enum" RENAME TO "orders_status_enum_old"`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."orders_status_enum" AS ENUM('pending', 'confirmed', 'processing', 'shipping', 'completed', 'cancelled', 'refunded')`,
        );
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "orders" ALTER COLUMN "status" TYPE "public"."orders_status_enum" USING "status"::text::"public"."orders_status_enum"`,
        );
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."orders_status_enum_old"`);

        await queryRunner.query(
            `ALTER TYPE "public"."orders_payment_method_enum" RENAME TO "orders_payment_method_enum_old"`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."orders_payment_method_enum" AS ENUM('cod', 'bank_transfer', 'credit_card', 'e_wallet')`,
        );
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "payment_method" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "orders" ALTER COLUMN "payment_method" TYPE "public"."orders_payment_method_enum" USING "payment_method"::text::"public"."orders_payment_method_enum"`,
        );
        await queryRunner.query(
            `ALTER TABLE "orders" ALTER COLUMN "payment_method" SET DEFAULT 'cod'`,
        );
        await queryRunner.query(`DROP TYPE "public"."orders_payment_method_enum_old"`);
    }
}
