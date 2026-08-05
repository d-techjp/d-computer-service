import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropProductDescriptionColumn1786016020000 implements MigrationInterface {
    name = 'DropProductDescriptionColumn1786016020000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "description"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" ADD "description" text`);
    }
}
