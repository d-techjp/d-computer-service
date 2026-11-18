import { MigrationInterface, QueryRunner } from 'typeorm';

/** Sổ địa chỉ của khách đăng nhập (storefront: Tài khoản → Địa chỉ, và chọn nhanh ở checkout). */
export class CreateCustomerAddresses1787900000000 implements MigrationInterface {
    name = 'CreateCustomerAddresses1787900000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "customer_addresses" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "user_id" uuid NOT NULL,
                "label" character varying(50),
                "full_name" character varying(150) NOT NULL,
                "phone" character varying(20) NOT NULL,
                "province" character varying(150) NOT NULL,
                "district" character varying(150),
                "ward" character varying(150),
                "street" character varying(255) NOT NULL,
                "is_default" boolean NOT NULL DEFAULT false,
                CONSTRAINT "pk_customer_addresses" PRIMARY KEY ("id"),
                CONSTRAINT "fk_customer_addresses_user" FOREIGN KEY ("user_id")
                    REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(
            `CREATE INDEX "idx_customer_addresses_user" ON "customer_addresses" ("user_id")`,
        );
        // Mỗi khách tối đa một địa chỉ mặc định — chặn ở DB, không chỉ ở service
        await queryRunner.query(
            `CREATE UNIQUE INDEX "uq_customer_addresses_default" ON "customer_addresses" ("user_id") WHERE "is_default"`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "customer_addresses"`);
    }
}
