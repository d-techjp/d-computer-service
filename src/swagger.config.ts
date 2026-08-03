import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';

/**
 * Nguồn sự thật duy nhất cho tài liệu OpenAPI — dùng chung bởi `main.ts` (mount Swagger UI)
 * và `scripts/export-openapi.ts` (xuất file phục vụ Postman / công cụ khác).
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
