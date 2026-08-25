import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSiteSettingsFooterColumns1786910000000 implements MigrationInterface {
    name = 'AddSiteSettingsFooterColumns1786910000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "site_settings"
            ADD COLUMN "footer_columns" jsonb NOT NULL DEFAULT '[]'
        `);

        // Seed đúng dòng site_settings hiện có (bảng chỉ có 1 dòng) với dữ liệu
        // đang hardcode ở footer storefront hiện tại (dictionary tiếng Việt) —
        // chuyển sang lấy từ API không bị "trắng cột" ngay sau migration.
        // Hầu hết link chưa có trang đích thật (`FOOTER_PATHS` phía FE trước đây
        // cũng để rỗng), admin điền link thật dần qua CRUD.
        await queryRunner.query(`
            UPDATE "site_settings"
            SET "footer_columns" = '[
                {
                    "id": "9527a70c-9296-44f1-b311-92eebf6b2255",
                    "title": "Sản phẩm · Dịch vụ",
                    "links": [
                        { "id": "c6fb2dcb-717b-44cd-bc6a-4bd622d95e0c", "label": "Danh sách sản phẩm", "url": "/products" },
                        { "id": "cb0bb2df-59d8-4665-ac88-f7c570c9c0d6", "label": "PC theo yêu cầu", "url": "" },
                        { "id": "328b8eeb-39cc-4ead-bdc7-1a100ddf92f6", "label": "Danh sách linh kiện", "url": "" },
                        { "id": "057ef387-e36d-4f90-bb0b-dd33fe6ce051", "label": "Chương trình khuyến mãi", "url": "" }
                    ]
                },
                {
                    "id": "f702d7b0-f4a6-4f84-9159-957721a2ee6b",
                    "title": "Hướng dẫn",
                    "links": [
                        { "id": "7d91539e-cd38-4cbc-9c53-aa9d4c9c1377", "label": "Phương thức thanh toán", "url": "" },
                        { "id": "aa205289-1f2c-473a-ba32-5349115d7276", "label": "Vận chuyển", "url": "" },
                        { "id": "2ab0d62e-6895-4c68-80b8-b4580edd6613", "label": "Đổi trả", "url": "" },
                        { "id": "bf2cbf95-3177-4f4b-9a58-b6b59a7426f4", "label": "Câu hỏi thường gặp", "url": "" }
                    ]
                },
                {
                    "id": "dad7625b-79c3-4ed2-8f85-41238e72a8bd",
                    "title": "Hỗ trợ",
                    "links": [
                        { "id": "b3eb8c56-09ed-4ada-a5eb-b12c787df995", "label": "Liên hệ", "url": "" },
                        { "id": "e61317db-63d1-41ee-acfa-d26b324c56f9", "label": "Bảo hành", "url": "" },
                        { "id": "9e6843e6-6e46-4053-9140-5fcc91367fb1", "label": "Thông tin hỗ trợ", "url": "" },
                        { "id": "f4c9a1df-fadd-41d5-9adf-cec1058a3f97", "label": "Tải driver", "url": "" }
                    ]
                },
                {
                    "id": "5a50ff58-fb43-4036-9c15-68d931dfdcfd",
                    "title": "Công ty",
                    "links": [
                        { "id": "1bb3b639-89f2-401f-8630-03508d46ad44", "label": "Giới thiệu công ty", "url": "" },
                        { "id": "b9238d32-293b-4303-a928-f335b51e8391", "label": "Chính sách đặc thù", "url": "" },
                        { "id": "aa22ca49-3230-4d0e-abb9-c0bd4cb47e64", "label": "Chính sách bảo mật", "url": "" }
                    ]
                }
            ]'::jsonb
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "site_settings" DROP COLUMN "footer_columns"`);
    }
}
