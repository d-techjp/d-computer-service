import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductDescriptions1785924429410 implements MigrationInterface {
    name = 'AddProductDescriptions1785924429410';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "product_descriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "product_id" uuid NOT NULL, "content" text NOT NULL DEFAULT '', CONSTRAINT "REL_e80d4c1bec1bee06d8a400463d" UNIQUE ("product_id"), CONSTRAINT "PK_8448465bc4faa6348b235d9b087" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "uq_product_descriptions_product_id" ON "product_descriptions"  ("product_id") `,
        );
        await queryRunner.query(
            `ALTER TABLE "product_descriptions" ADD CONSTRAINT "FK_e80d4c1bec1bee06d8a400463da" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "product_descriptions" DROP CONSTRAINT "FK_e80d4c1bec1bee06d8a400463da"`,
        );
        await queryRunner.query(`DROP INDEX "public"."uq_product_descriptions_product_id"`);
        await queryRunner.query(`DROP TABLE "product_descriptions"`);
    }
}
