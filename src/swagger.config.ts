import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import { ADMIN_ROUTE_PREFIX } from './common/decorators/admin-controller.decorator';

/** Nhóm API đọc tài liệu: storefront hay trang quản trị. */
export type ApiAudience = 'client' | 'admin';

const isAdminPath = (path: string): boolean => path.includes(`/${ADMIN_ROUTE_PREFIX}/`);

/**
 * Nguồn sự thật duy nhất cho tài liệu OpenAPI — dùng chung bởi `main.ts` (mount Swagger UI)
 * và `scripts/export-openapi.ts` (xuất file phục vụ Postman / công cụ khác).
 *
 * Trả về document ĐẦY ĐỦ (client + admin). Dùng `pickAudience()` để cắt theo từng phía.
 */
export const createOpenApiDocument = (app: INestApplication): OpenAPIObject => {
    const config = new DocumentBuilder()
        .setTitle('D-Computer Service API')
        .setDescription('API thương mại điện tử: auth, users, products, orders, articles...')
        .setVersion('1.0')
        // Không truyền tên thứ 2 -> mặc định 'bearer', khớp với @ApiBearerAuth() không tham số
        // dùng ở mọi controller. Đặt tên khác đi sẽ khiến nút Authorize không tự gắn được token.
        .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
        // Path đã gồm sẵn global prefix + version (/api/v1/...) nên server chỉ cần domain gốc.
        // openapi-to-postmanv2 dùng URL này để suy ra biến {{baseUrl}} cho Postman collection.
        .addServer('http://localhost:3000', 'Local')
        .build();

    return SwaggerModule.createDocument(app, config);
};

/**
 * Cắt document đầy đủ thành tài liệu của riêng một phía, dựa trên tiền tố `admin/`
 * trong path. Lọc ở mức path (không dùng option `include` của SwaggerModule) vì
 * controller client và admin của cùng một tài nguyên nằm chung một Nest module.
 *
 * `components` giữ nguyên: schema thừa không hiển thị trên UI, mà lọc chúng thì
 * phải lần theo `$ref` lồng nhau — không đáng.
 */
export const pickAudience = (document: OpenAPIObject, audience: ApiAudience): OpenAPIObject => {
    // Không còn route nào dùng chung: phía quản trị có bản `/admin/auth/*` riêng,
    // nên cắt gọn theo tiền tố là đủ và mỗi tài liệu chỉ chứa đúng phần của mình.
    const keep = (path: string): boolean =>
        audience === 'admin' ? isAdminPath(path) : !isAdminPath(path);

    return {
        ...document,
        info: {
            ...document.info,
            title: `${document.info.title} — ${audience === 'admin' ? 'Admin' : 'Client'}`,
        },
        paths: Object.fromEntries(Object.entries(document.paths).filter(([path]) => keep(path))),
    };
};
