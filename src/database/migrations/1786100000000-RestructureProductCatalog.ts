import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tách `products` thành master + `product_variants`.
 *
 * Backfill: mỗi sản phẩm hiện có sinh đúng một biến thể mặc định mang toàn bộ
 * sku/giá/tồn kho cũ, rồi `order_items` được trỏ sang biến thể đó. Nhờ vậy đơn
 * hàng cũ vẫn tra ngược được hàng đã bán trước khi chuyển đổi.
 *
 * `down()` chỉ khôi phục được sản phẩm một biến thể — sản phẩm nhiều biến thể
 * sẽ mất các biến thể ngoài biến thể mặc định. Đây là chiều không thể đảo ngược
 * trọn vẹn về mặt dữ liệu, không phải thiếu sót của migration.
 */
export class RestructureProductCatalog1786100000000 implements MigrationInterface {
    name = 'RestructureProductCatalog1786100000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TYPE "public"."products_product_type_enum" AS ENUM('standard', 'bundle', 'service')`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."product_variants_bundle_inventory_policy_enum" AS ENUM('derived_from_components', 'own_stock')`,
        );

        // ── products: bổ sung cột master ────────────────────────────────────
        await queryRunner.query(
            `ALTER TABLE "products"
                ADD "product_type" "public"."products_product_type_enum" NOT NULL DEFAULT 'standard',
                ADD "has_variants" boolean NOT NULL DEFAULT false,
                ADD "min_price" numeric(14,2),
                ADD "max_price" numeric(14,2),
                ADD "total_stock" integer NOT NULL DEFAULT 0`,
        );

        // ── product_variants ────────────────────────────────────────────────
        await queryRunner.query(
            `CREATE TABLE "product_variants" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP WITH TIME ZONE,
                "product_id" uuid NOT NULL,
                "name" character varying(255) NOT NULL,
                "sku" character varying(100) NOT NULL,
                "barcode" character varying(64),
                "price" numeric(14,2) NOT NULL,
                "compare_at_price" numeric(14,2),
                "cost_price" numeric(14,2),
                "stock" integer NOT NULL DEFAULT 0,
                "low_stock_threshold" integer NOT NULL DEFAULT 0,
                "weight_grams" integer,
                "thumbnail" character varying(500),
                "images" jsonb,
                "position" integer NOT NULL DEFAULT 0,
                "is_default" boolean NOT NULL DEFAULT false,
                "is_active" boolean NOT NULL DEFAULT true,
                "track_inventory" boolean NOT NULL DEFAULT true,
                "bundle_inventory_policy" "public"."product_variants_bundle_inventory_policy_enum",
                "sold_count" integer NOT NULL DEFAULT 0,
                CONSTRAINT "PK_product_variants" PRIMARY KEY ("id")
            )`,
        );
        await queryRunner.query(
            `ALTER TABLE "product_variants" ADD CONSTRAINT "FK_product_variants_product"
             FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );

        // ── options ─────────────────────────────────────────────────────────
        await queryRunner.query(
            `CREATE TABLE "product_options" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "product_id" uuid NOT NULL,
                "name" character varying(100) NOT NULL,
                "position" integer NOT NULL DEFAULT 0,
                CONSTRAINT "PK_product_options" PRIMARY KEY ("id")
            )`,
        );
        await queryRunner.query(
            `ALTER TABLE "product_options" ADD CONSTRAINT "FK_product_options_product"
             FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `CREATE TABLE "product_option_values" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "option_id" uuid NOT NULL,
                "value" character varying(100) NOT NULL,
                "position" integer NOT NULL DEFAULT 0,
                CONSTRAINT "PK_product_option_values" PRIMARY KEY ("id")
            )`,
        );
        await queryRunner.query(
            `ALTER TABLE "product_option_values" ADD CONSTRAINT "FK_product_option_values_option"
             FOREIGN KEY ("option_id") REFERENCES "product_options"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `CREATE TABLE "product_variant_option_values" (
                "variant_id" uuid NOT NULL,
                "option_value_id" uuid NOT NULL,
                CONSTRAINT "PK_product_variant_option_values" PRIMARY KEY ("variant_id", "option_value_id")
            )`,
        );
        await queryRunner.query(
            `ALTER TABLE "product_variant_option_values"
                ADD CONSTRAINT "FK_pvov_variant" FOREIGN KEY ("variant_id")
                REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                ADD CONSTRAINT "FK_pvov_option_value" FOREIGN KEY ("option_value_id")
                REFERENCES "product_option_values"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
        );

        // ── bundle items ────────────────────────────────────────────────────
        await queryRunner.query(
            `CREATE TABLE "product_bundle_items" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "bundle_variant_id" uuid NOT NULL,
                "component_variant_id" uuid NOT NULL,
                "quantity" integer NOT NULL DEFAULT 1,
                "position" integer NOT NULL DEFAULT 0,
                "is_optional" boolean NOT NULL DEFAULT false,
                CONSTRAINT "PK_product_bundle_items" PRIMARY KEY ("id"),
                CONSTRAINT "CHK_product_bundle_items_quantity" CHECK ("quantity" > 0),
                CONSTRAINT "CHK_product_bundle_items_no_self" CHECK ("bundle_variant_id" <> "component_variant_id")
            )`,
        );
        await queryRunner.query(
            `ALTER TABLE "product_bundle_items"
                ADD CONSTRAINT "FK_product_bundle_items_bundle" FOREIGN KEY ("bundle_variant_id")
                REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                ADD CONSTRAINT "FK_product_bundle_items_component" FOREIGN KEY ("component_variant_id")
                REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
        );

        // ── order_items: trỏ sang variant ──────────────────────────────────
        await queryRunner.query(
            `ALTER TABLE "order_items"
                ADD "parent_item_id" uuid,
                ADD "variant_id" uuid,
                ADD "variant_name" character varying(255)`,
        );
        await queryRunner.query(
            `ALTER TABLE "order_items"
                ADD CONSTRAINT "FK_order_items_parent" FOREIGN KEY ("parent_item_id")
                REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                ADD CONSTRAINT "FK_order_items_variant" FOREIGN KEY ("variant_id")
                REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
        );

        // ── Backfill ────────────────────────────────────────────────────────
        await queryRunner.query(
            `INSERT INTO "product_variants" (
                "product_id", "name", "sku", "price", "compare_at_price", "cost_price",
                "stock", "low_stock_threshold", "thumbnail", "images",
                "is_default", "is_active", "sold_count", "created_at", "updated_at", "deleted_at"
             )
             SELECT
                "id", "name", "sku", "price", "compare_at_price", "cost_price",
                "stock", "low_stock_threshold", "thumbnail", "images",
                true, true, "sold_count", "created_at", "updated_at", "deleted_at"
             FROM "products"`,
        );
        await queryRunner.query(
            `UPDATE "order_items" SET "variant_id" = "v"."id", "variant_name" = "v"."name"
             FROM "product_variants" "v"
             WHERE "v"."product_id" = "order_items"."product_id"
               AND "order_items"."product_id" IS NOT NULL`,
        );
        await queryRunner.query(
            `UPDATE "products" SET
                "min_price" = "price",
                "max_price" = "price",
                "total_stock" = "stock",
                "has_variants" = false`,
        );

        // ── Gỡ các cột đã chuyển xuống variant ─────────────────────────────
        await queryRunner.query(`DROP INDEX "public"."uq_products_sku"`);
        await queryRunner.query(
            `ALTER TABLE "products"
                DROP COLUMN "sku",
                DROP COLUMN "price",
                DROP COLUMN "compare_at_price",
                DROP COLUMN "cost_price",
                DROP COLUMN "stock",
                DROP COLUMN "low_stock_threshold"`,
        );

        // ── Index ───────────────────────────────────────────────────────────
        await queryRunner.query(
            `CREATE UNIQUE INDEX "uq_product_variants_sku" ON "product_variants" ("sku") WHERE "deleted_at" IS NULL`,
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "uq_product_variants_default" ON "product_variants" ("product_id")
             WHERE "is_default" = true AND "deleted_at" IS NULL`,
        );
        await queryRunner.query(
            `CREATE INDEX "idx_product_variants_product" ON "product_variants" ("product_id", "position")`,
        );
        await queryRunner.query(
            `CREATE INDEX "idx_product_variants_active_price" ON "product_variants" ("is_active", "price")`,
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "uq_product_options_product_name" ON "product_options" ("product_id", "name")`,
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "uq_product_option_values_option_value" ON "product_option_values" ("option_id", "value")`,
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "uq_product_bundle_items_pair" ON "product_bundle_items" ("bundle_variant_id", "component_variant_id")`,
        );
        await queryRunner.query(
            `CREATE INDEX "idx_product_bundle_items_component" ON "product_bundle_items" ("component_variant_id")`,
        );
        await queryRunner.query(
            `CREATE INDEX "idx_products_type_status" ON "products" ("product_type", "status")`,
        );
        await queryRunner.query(
            `CREATE INDEX "idx_products_status_min_price" ON "products" ("status", "min_price")`,
        );
        await queryRunner.query(
            `CREATE INDEX "idx_order_items_parent" ON "order_items" ("parent_item_id")`,
        );
        await queryRunner.query(
            `CREATE INDEX "idx_order_items_variant" ON "order_items" ("variant_id")`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_order_items_variant"`);
        await queryRunner.query(`DROP INDEX "public"."idx_order_items_parent"`);
        await queryRunner.query(`DROP INDEX "public"."idx_products_status_min_price"`);
        await queryRunner.query(`DROP INDEX "public"."idx_products_type_status"`);

        await queryRunner.query(
            `ALTER TABLE "products"
                ADD "sku" character varying(100),
                ADD "price" numeric(14,2),
                ADD "compare_at_price" numeric(14,2),
                ADD "cost_price" numeric(14,2),
                ADD "stock" integer NOT NULL DEFAULT 0,
                ADD "low_stock_threshold" integer NOT NULL DEFAULT 0`,
        );
        // Chỉ khôi phục được biến thể mặc định — biến thể khác không có chỗ để về.
        await queryRunner.query(
            `UPDATE "products" SET
                "sku" = "v"."sku",
                "price" = "v"."price",
                "compare_at_price" = "v"."compare_at_price",
                "cost_price" = "v"."cost_price",
                "stock" = "v"."stock",
                "low_stock_threshold" = "v"."low_stock_threshold"
             FROM "product_variants" "v"
             WHERE "v"."product_id" = "products"."id" AND "v"."is_default" = true`,
        );
        await queryRunner.query(
            `UPDATE "products" SET "sku" = 'LEGACY-' || "id", "price" = 0 WHERE "sku" IS NULL`,
        );
        await queryRunner.query(
            `ALTER TABLE "products"
                ALTER COLUMN "sku" SET NOT NULL,
                ALTER COLUMN "price" SET NOT NULL`,
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "uq_products_sku" ON "products" ("sku") WHERE "deleted_at" IS NULL`,
        );

        await queryRunner.query(
            `ALTER TABLE "order_items"
                DROP CONSTRAINT "FK_order_items_variant",
                DROP CONSTRAINT "FK_order_items_parent",
                DROP COLUMN "variant_name",
                DROP COLUMN "variant_id",
                DROP COLUMN "parent_item_id"`,
        );

        await queryRunner.query(`DROP TABLE "product_bundle_items"`);
        await queryRunner.query(`DROP TABLE "product_variant_option_values"`);
        await queryRunner.query(`DROP TABLE "product_option_values"`);
        await queryRunner.query(`DROP TABLE "product_options"`);
        await queryRunner.query(`DROP TABLE "product_variants"`);

        await queryRunner.query(
            `ALTER TABLE "products"
                DROP COLUMN "total_stock",
                DROP COLUMN "max_price",
                DROP COLUMN "min_price",
                DROP COLUMN "has_variants",
                DROP COLUMN "product_type"`,
        );
        await queryRunner.query(
            `DROP TYPE "public"."product_variants_bundle_inventory_policy_enum"`,
        );
        await queryRunner.query(`DROP TYPE "public"."products_product_type_enum"`);
    }
}
