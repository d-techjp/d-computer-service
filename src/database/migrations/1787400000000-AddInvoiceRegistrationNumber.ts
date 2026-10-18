import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvoiceRegistrationNumber1787400000000 implements MigrationInterface {
    name = 'AddInvoiceRegistrationNumber1787400000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "site_settings" ADD COLUMN "invoice_registration_number" character varying(14) NOT NULL DEFAULT ''`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "site_settings" DROP COLUMN "invoice_registration_number"`,
        );
    }
}
