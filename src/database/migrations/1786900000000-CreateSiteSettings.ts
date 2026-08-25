import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSiteSettings1786900000000 implements MigrationInterface {
    name = 'CreateSiteSettings1786900000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "site_settings" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "company_name" character varying(150) NOT NULL DEFAULT '',
                "phone" character varying(50) NOT NULL DEFAULT '',
                "address" character varying(500) NOT NULL DEFAULT '',
                "social_links" jsonb NOT NULL DEFAULT '[]',
                CONSTRAINT "pk_site_settings" PRIMARY KEY ("id")
            )
        `);

        // Seed đúng một dòng, mang theo dữ liệu đang hardcode ở footer storefront
        // hiện tại — chuyển sang lấy từ API không bị "trắng footer" ngay sau
        // migration, admin chỉnh sửa dần từ đây thay vì phải nhập lại từ đầu.
        await queryRunner.query(`
            INSERT INTO "site_settings" ("company_name", "phone", "address", "social_links")
            VALUES (
                'D-TECH',
                '080-6473-2260',
                '大阪市西成区玉出東１－３－１６ ドエル１番館103号',
                '[
                    {
                        "id": "c24ad34a-8c77-44ce-b24a-b02356694a0e",
                        "name": "Facebook",
                        "logoUrl": "/fb.png",
                        "url": "https://www.facebook.com/nguyenviet.dung.92"
                    },
                    {
                        "id": "120246d5-8535-4cb6-8b12-f392f79ad87d",
                        "name": "TikTok",
                        "logoUrl": "/tiktok.png",
                        "url": "https://www.tiktok.com/@dcomputer7?_r=1&_t=ZS-98octHc6xDp"
                    },
                    {
                        "id": "1fdcd34c-b7c5-4b4a-8000-c20dc2d7c2d8",
                        "name": "Beacons",
                        "logoUrl": "/beacons.png",
                        "url": "https://beacons.ai/dcomputer"
                    }
                ]'::jsonb
            )
        `);

        await queryRunner.query(`
            INSERT INTO "permissions" ("code", "name", "module", "description")
            VALUES (
                'site.settings.manage',
                'Quản lý thông tin cửa hàng',
                'campaign',
                'Sửa tên công ty, hotline, địa chỉ, link mạng xã hội hiển thị ở footer'
            )
            ON CONFLICT ("code") DO NOTHING
        `);

        await queryRunner.query(`
            INSERT INTO "role_permissions" ("role_id", "permission_id")
            SELECT r.id, p.id
            FROM "roles" r
            CROSS JOIN "permissions" p
            WHERE p.code = 'site.settings.manage'
                AND r.code IN ('admin', 'staff')
            ON CONFLICT DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "permissions" WHERE "code" = 'site.settings.manage'`);
        await queryRunner.query(`DROP TABLE "site_settings"`);
    }
}
