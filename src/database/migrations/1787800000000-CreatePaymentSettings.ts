import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Chuyển `STRIPE_PAYMENT_METHOD_TYPES` (env) vào bảng `payment_settings`, bật/tắt ở
 * admin Cài đặt → Thanh toán. Dòng mặc định: COD + thẻ (kèm trả góp); PayPay / Alipay
 * tắt vì còn chờ Stripe duyệt — bật loại chưa duyệt là Stripe từ chối tạo phiên.
 * Dùng lại quyền `settings.manage` (chỉ admin), không thêm quyền mới.
 */
export class CreatePaymentSettings1787800000000 implements MigrationInterface {
    name = 'CreatePaymentSettings1787800000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "payment_settings" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "cod_enabled" boolean NOT NULL DEFAULT true,
                "card_enabled" boolean NOT NULL DEFAULT true,
                "card_installments_enabled" boolean NOT NULL DEFAULT true,
                "paypay_enabled" boolean NOT NULL DEFAULT false,
                "alipay_enabled" boolean NOT NULL DEFAULT false,
                CONSTRAINT "pk_payment_settings" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`INSERT INTO "payment_settings" DEFAULT VALUES`);
        await queryRunner.query(`
            UPDATE "permissions"
            SET "description" = 'Sửa cấu hình vận hành: hộp thư báo đơn mới, phương thức thanh toán'
            WHERE "code" = 'settings.manage'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE "permissions"
            SET "description" = 'Sửa cấu hình vận hành: hộp thư nhận email báo đơn mới'
            WHERE "code" = 'settings.manage'
        `);
        await queryRunner.query(`DROP TABLE "payment_settings"`);
    }
}
