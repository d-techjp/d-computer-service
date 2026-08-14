import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Chỉ tạo `carts` + `cart_items`. Bản sinh tự động (`migration:generate`) còn
 * kèm một loạt DROP/ADD constraint & index của các bảng cũ — đó là drift do lệch
 * tên FK có sẵn từ trước, không phải thay đổi của module cart — đã lược bỏ thủ
 * công (giống hệt tình huống khi thêm `inventory_transactions`).
 */
export class CreateCarts1786704735490 implements MigrationInterface {
    name = 'CreateCarts1786704735490';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TYPE "public"."carts_status_enum" AS ENUM('active', 'converted')`,
        );
        await queryRunner.query(
            `CREATE TABLE "carts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid, "status" "public"."carts_status_enum" NOT NULL DEFAULT 'active', "order_id" uuid, CONSTRAINT "PK_b5f695a59f5ebb50af3c8160816" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE INDEX "idx_carts_user_status" ON "carts" ("user_id", "status") `,
        );
        await queryRunner.query(
            `CREATE TABLE "cart_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "cart_id" uuid NOT NULL, "variant_id" uuid NOT NULL, "quantity" integer NOT NULL, "added_unit_price" numeric(14,2) NOT NULL, CONSTRAINT "PK_6fccf5ec03c172d27a28a82928b" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "uq_cart_items_cart_variant" ON "cart_items" ("cart_id", "variant_id") `,
        );
        await queryRunner.query(
            `ALTER TABLE "carts" ADD CONSTRAINT "FK_2ec1c94a977b940d85a4f498aea" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "cart_items" ADD CONSTRAINT "FK_6385a745d9e12a89b859bb25623" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "cart_items" ADD CONSTRAINT "FK_ede780fc2b865d1d1323e598038" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "cart_items" DROP CONSTRAINT "FK_ede780fc2b865d1d1323e598038"`,
        );
        await queryRunner.query(
            `ALTER TABLE "cart_items" DROP CONSTRAINT "FK_6385a745d9e12a89b859bb25623"`,
        );
        await queryRunner.query(
            `ALTER TABLE "carts" DROP CONSTRAINT "FK_2ec1c94a977b940d85a4f498aea"`,
        );
        await queryRunner.query(`DROP INDEX "public"."uq_cart_items_cart_variant"`);
        await queryRunner.query(`DROP TABLE "cart_items"`);
        await queryRunner.query(`DROP INDEX "public"."idx_carts_user_status"`);
        await queryRunner.query(`DROP TABLE "carts"`);
        await queryRunner.query(`DROP TYPE "public"."carts_status_enum"`);
    }
}
