import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Chỉ tạo bảng sổ nhập-xuất kho `inventory_transactions`. Bản sinh tự động
 * (`migration:generate`) còn kèm theo một loạt DROP/ADD constraint & index
 * không liên quan (drift đặt tên FK có sẵn từ trước) — đã lược bỏ thủ công,
 * chỉ giữ lại đúng phần thay đổi của module `inventory`.
 */
export class CreateInventoryTransactions1786694581840 implements MigrationInterface {
    name = 'CreateInventoryTransactions1786694581840';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TYPE "public"."inventory_transactions_type_enum" AS ENUM('in', 'out')`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."inventory_transactions_reason_code_enum" AS ENUM('purchase', 'return_from_customer', 'order_sale', 'order_cancelled', 'damaged', 'lost', 'stocktake_adjustment', 'other')`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."inventory_transactions_reference_type_enum" AS ENUM('order', 'manual')`,
        );
        await queryRunner.query(
            `CREATE TABLE "inventory_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "variant_id" uuid, "type" "public"."inventory_transactions_type_enum" NOT NULL, "reason_code" "public"."inventory_transactions_reason_code_enum" NOT NULL, "quantity" integer NOT NULL, "stock_before" integer NOT NULL, "stock_after" integer NOT NULL, "reference_type" "public"."inventory_transactions_reference_type_enum", "reference_id" uuid, "performed_by_id" uuid, "note" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_9b7144851f08f9eededde7edd42" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE INDEX "idx_inventory_transactions_created_at" ON "inventory_transactions" ("created_at") `,
        );
        await queryRunner.query(
            `CREATE INDEX "idx_inventory_transactions_reference" ON "inventory_transactions" ("reference_type", "reference_id") `,
        );
        await queryRunner.query(
            `CREATE INDEX "idx_inventory_transactions_variant_created" ON "inventory_transactions" ("variant_id", "created_at") `,
        );
        await queryRunner.query(
            `ALTER TABLE "inventory_transactions" ADD CONSTRAINT "FK_aeb0f3a59ed2fd95e1a13097eda" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "inventory_transactions" ADD CONSTRAINT "FK_e9ee5e047ab2db01665b51affe6" FOREIGN KEY ("performed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "inventory_transactions" DROP CONSTRAINT "FK_e9ee5e047ab2db01665b51affe6"`,
        );
        await queryRunner.query(
            `ALTER TABLE "inventory_transactions" DROP CONSTRAINT "FK_aeb0f3a59ed2fd95e1a13097eda"`,
        );
        await queryRunner.query(`DROP INDEX "public"."idx_inventory_transactions_variant_created"`);
        await queryRunner.query(`DROP INDEX "public"."idx_inventory_transactions_reference"`);
        await queryRunner.query(`DROP INDEX "public"."idx_inventory_transactions_created_at"`);
        await queryRunner.query(`DROP TABLE "inventory_transactions"`);
        await queryRunner.query(`DROP TYPE "public"."inventory_transactions_reference_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."inventory_transactions_reason_code_enum"`);
        await queryRunner.query(`DROP TYPE "public"."inventory_transactions_type_enum"`);
    }
}
