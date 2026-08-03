import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1785655978128 implements MigrationInterface {
    name = 'InitSchema1785655978128';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "brands" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "name" character varying(150) NOT NULL, "slug" character varying(180) NOT NULL, "description" text, "logo_url" character varying(500), "website" character varying(500), "country" character varying(100), "sort_order" integer NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_b0c437120b624da1034a81fc561" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "uq_brands_slug" ON "brands"  ("slug") WHERE "deleted_at" IS NULL`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."orders_status_enum" AS ENUM('pending', 'confirmed', 'processing', 'shipping', 'completed', 'cancelled', 'refunded')`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."orders_payment_status_enum" AS ENUM('unpaid', 'paid', 'refunded', 'failed')`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."orders_payment_method_enum" AS ENUM('cod', 'bank_transfer', 'credit_card', 'e_wallet')`,
        );
        await queryRunner.query(
            `CREATE TABLE "orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "code" character varying(32) NOT NULL, "user_id" uuid, "status" "public"."orders_status_enum" NOT NULL DEFAULT 'pending', "payment_status" "public"."orders_payment_status_enum" NOT NULL DEFAULT 'unpaid', "payment_method" "public"."orders_payment_method_enum" NOT NULL DEFAULT 'cod', "subtotal" numeric(14,2) NOT NULL DEFAULT '0', "discount" numeric(14,2) NOT NULL DEFAULT '0', "shipping_fee" numeric(14,2) NOT NULL DEFAULT '0', "total" numeric(14,2) NOT NULL DEFAULT '0', "shipping_address" jsonb NOT NULL, "note" character varying(500), "cancel_reason" character varying(500), "confirmed_at" TIMESTAMP WITH TIME ZONE, "completed_at" TIMESTAMP WITH TIME ZONE, "cancelled_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_orders_code" ON "orders"  ("code") `);
        await queryRunner.query(
            `CREATE INDEX "idx_orders_created_at" ON "orders"  ("created_at") `,
        );
        await queryRunner.query(
            `CREATE INDEX "idx_orders_user_status" ON "orders"  ("user_id", "status") `,
        );
        await queryRunner.query(
            `CREATE TABLE "order_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "order_id" uuid NOT NULL, "product_id" uuid, "product_name" character varying(255) NOT NULL, "sku" character varying(100) NOT NULL, "thumbnail" character varying(500), "unit_price" numeric(14,2) NOT NULL, "quantity" integer NOT NULL, "total" numeric(14,2) NOT NULL, CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE INDEX "idx_order_items_order" ON "order_items"  ("order_id") `,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."products_status_enum" AS ENUM('draft', 'active', 'out_of_stock', 'archived')`,
        );
        await queryRunner.query(
            `CREATE TABLE "products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "name" character varying(255) NOT NULL, "slug" character varying(300) NOT NULL, "sku" character varying(100) NOT NULL, "short_description" character varying(500), "description" text, "price" numeric(14,2) NOT NULL, "compare_at_price" numeric(14,2), "cost_price" numeric(14,2), "stock" integer NOT NULL DEFAULT '0', "low_stock_threshold" integer NOT NULL DEFAULT '0', "thumbnail" character varying(500), "images" jsonb, "specifications" jsonb, "status" "public"."products_status_enum" NOT NULL DEFAULT 'draft', "is_featured" boolean NOT NULL DEFAULT false, "view_count" integer NOT NULL DEFAULT '0', "sold_count" integer NOT NULL DEFAULT '0', "category_id" uuid, "brand_id" uuid, CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "uq_products_slug" ON "products"  ("slug") WHERE "deleted_at" IS NULL`,
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "uq_products_sku" ON "products"  ("sku") WHERE "deleted_at" IS NULL`,
        );
        await queryRunner.query(
            `CREATE INDEX "idx_products_category_status" ON "products"  ("category_id", "status") `,
        );
        await queryRunner.query(
            `CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "name" character varying(150) NOT NULL, "slug" character varying(180) NOT NULL, "description" text, "image_url" character varying(500), "parent_id" uuid, "sort_order" integer NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "uq_categories_slug" ON "categories"  ("slug") WHERE "deleted_at" IS NULL`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."articles_status_enum" AS ENUM('draft', 'published', 'archived')`,
        );
        await queryRunner.query(
            `CREATE TABLE "articles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "title" character varying(255) NOT NULL, "slug" character varying(300) NOT NULL, "excerpt" character varying(500), "content" text NOT NULL, "thumbnail" character varying(500), "status" "public"."articles_status_enum" NOT NULL DEFAULT 'draft', "published_at" TIMESTAMP WITH TIME ZONE, "tags" jsonb, "view_count" integer NOT NULL DEFAULT '0', "meta_title" character varying(255), "meta_description" character varying(500), "category_id" uuid, "author_id" uuid, CONSTRAINT "PK_0a6e2c450d83e0b6052c2793334" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "uq_articles_slug" ON "articles"  ("slug") WHERE "deleted_at" IS NULL`,
        );
        await queryRunner.query(
            `CREATE INDEX "idx_articles_status_published_at" ON "articles"  ("status", "published_at") `,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'staff', 'customer')`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'inactive', 'banned')`,
        );
        await queryRunner.query(
            `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "email" character varying(255) NOT NULL, "password" character varying(255) NOT NULL, "full_name" character varying(150) NOT NULL, "phone" character varying(20), "avatar_url" character varying(500), "role" "public"."users_role_enum" NOT NULL DEFAULT 'customer', "status" "public"."users_status_enum" NOT NULL DEFAULT 'active', "last_login_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "uq_users_email" ON "users"  ("email") WHERE "deleted_at" IS NULL`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."activity_logs_status_enum" AS ENUM('success', 'failed')`,
        );
        await queryRunner.query(
            `CREATE TABLE "activity_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid, "user_email" character varying(255), "action" character varying(64) NOT NULL, "resource" character varying(64) NOT NULL, "resource_id" character varying(64), "status" "public"."activity_logs_status_enum" NOT NULL DEFAULT 'success', "description" character varying(500), "method" character varying(10), "path" character varying(500), "status_code" integer, "duration_ms" integer, "ip_address" character varying(64), "user_agent" character varying(500), "metadata" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f25287b6140c5ba18d38776a796" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE INDEX "idx_activity_logs_created_at" ON "activity_logs"  ("created_at") `,
        );
        await queryRunner.query(
            `CREATE INDEX "idx_activity_logs_resource" ON "activity_logs"  ("resource", "resource_id") `,
        );
        await queryRunner.query(
            `CREATE INDEX "idx_activity_logs_user_created" ON "activity_logs"  ("user_id", "created_at") `,
        );
        await queryRunner.query(
            `ALTER TABLE "orders" ADD CONSTRAINT "FK_a922b820eeef29ac1c6800e826a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "order_items" ADD CONSTRAINT "FK_145532db85752b29c57d2b7b1f1" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "order_items" ADD CONSTRAINT "FK_9263386c35b6b242540f9493b00" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "products" ADD CONSTRAINT "FK_9a5f6868c96e0069e699f33e124" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "products" ADD CONSTRAINT "FK_1530a6f15d3c79d1b70be98f2be" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "categories" ADD CONSTRAINT "FK_88cea2dc9c31951d06437879b40" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "articles" ADD CONSTRAINT "FK_e025eeefcdb2a269c42484ee43f" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "articles" ADD CONSTRAINT "FK_6515da4dff8db423ce4eb841490" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "activity_logs" ADD CONSTRAINT "FK_d54f841fa5478e4734590d44036" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "activity_logs" DROP CONSTRAINT "FK_d54f841fa5478e4734590d44036"`,
        );
        await queryRunner.query(
            `ALTER TABLE "articles" DROP CONSTRAINT "FK_6515da4dff8db423ce4eb841490"`,
        );
        await queryRunner.query(
            `ALTER TABLE "articles" DROP CONSTRAINT "FK_e025eeefcdb2a269c42484ee43f"`,
        );
        await queryRunner.query(
            `ALTER TABLE "categories" DROP CONSTRAINT "FK_88cea2dc9c31951d06437879b40"`,
        );
        await queryRunner.query(
            `ALTER TABLE "products" DROP CONSTRAINT "FK_1530a6f15d3c79d1b70be98f2be"`,
        );
        await queryRunner.query(
            `ALTER TABLE "products" DROP CONSTRAINT "FK_9a5f6868c96e0069e699f33e124"`,
        );
        await queryRunner.query(
            `ALTER TABLE "order_items" DROP CONSTRAINT "FK_9263386c35b6b242540f9493b00"`,
        );
        await queryRunner.query(
            `ALTER TABLE "order_items" DROP CONSTRAINT "FK_145532db85752b29c57d2b7b1f1"`,
        );
        await queryRunner.query(
            `ALTER TABLE "orders" DROP CONSTRAINT "FK_a922b820eeef29ac1c6800e826a"`,
        );
        await queryRunner.query(`DROP INDEX "public"."idx_activity_logs_user_created"`);
        await queryRunner.query(`DROP INDEX "public"."idx_activity_logs_resource"`);
        await queryRunner.query(`DROP INDEX "public"."idx_activity_logs_created_at"`);
        await queryRunner.query(`DROP TABLE "activity_logs"`);
        await queryRunner.query(`DROP TYPE "public"."activity_logs_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."uq_users_email"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."idx_articles_status_published_at"`);
        await queryRunner.query(`DROP INDEX "public"."uq_articles_slug"`);
        await queryRunner.query(`DROP TABLE "articles"`);
        await queryRunner.query(`DROP TYPE "public"."articles_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."uq_categories_slug"`);
        await queryRunner.query(`DROP TABLE "categories"`);
        await queryRunner.query(`DROP INDEX "public"."idx_products_category_status"`);
        await queryRunner.query(`DROP INDEX "public"."uq_products_sku"`);
        await queryRunner.query(`DROP INDEX "public"."uq_products_slug"`);
        await queryRunner.query(`DROP TABLE "products"`);
        await queryRunner.query(`DROP TYPE "public"."products_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."idx_order_items_order"`);
        await queryRunner.query(`DROP TABLE "order_items"`);
        await queryRunner.query(`DROP INDEX "public"."idx_orders_user_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_orders_created_at"`);
        await queryRunner.query(`DROP INDEX "public"."uq_orders_code"`);
        await queryRunner.query(`DROP TABLE "orders"`);
        await queryRunner.query(`DROP TYPE "public"."orders_payment_method_enum"`);
        await queryRunner.query(`DROP TYPE "public"."orders_payment_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."uq_brands_slug"`);
        await queryRunner.query(`DROP TABLE "brands"`);
    }
}
