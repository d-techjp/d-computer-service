import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCashPaymentMethod1787300000000 implements MigrationInterface {
    name = 'AddCashPaymentMethod1787300000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TYPE "public"."orders_payment_method_enum" ADD VALUE IF NOT EXISTS 'cash'`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Postgres không xoá được giá trị enum — dựng lại type
        await queryRunner.query(
            `UPDATE "orders" SET "payment_method" = 'cod' WHERE "payment_method" = 'cash'`,
        );
        await queryRunner.query(
            `ALTER TYPE "public"."orders_payment_method_enum" RENAME TO "orders_payment_method_enum_old"`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."orders_payment_method_enum" AS ENUM('cod', 'bank_transfer', 'credit_card', 'e_wallet', 'stripe', 'stripe_terminal')`,
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
