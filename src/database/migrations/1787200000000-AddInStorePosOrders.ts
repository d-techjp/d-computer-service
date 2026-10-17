import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInStorePosOrders1787200000000 implements MigrationInterface {
    name = 'AddInStorePosOrders1787200000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TYPE "public"."orders_payment_method_enum" ADD VALUE IF NOT EXISTS 'stripe_terminal'`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."orders_channel_enum" AS ENUM('online', 'in_store')`,
        );
        // Mọi đơn có trước đều do khách đặt trên web
        await queryRunner.query(
            `ALTER TABLE "orders" ADD COLUMN "channel" "public"."orders_channel_enum" NOT NULL DEFAULT 'online'`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "channel"`);
        await queryRunner.query(`DROP TYPE "public"."orders_channel_enum"`);

        // Postgres không xoá được giá trị enum — dựng lại type, giống migration Stripe
        await queryRunner.query(
            `UPDATE "orders" SET "payment_method" = 'credit_card' WHERE "payment_method" = 'stripe_terminal'`,
        );
        await queryRunner.query(
            `ALTER TYPE "public"."orders_payment_method_enum" RENAME TO "orders_payment_method_enum_old"`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."orders_payment_method_enum" AS ENUM('cod', 'bank_transfer', 'credit_card', 'e_wallet', 'stripe')`,
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
