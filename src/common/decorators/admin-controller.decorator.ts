import { applyDecorators, Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

/**
 * Tiền tố đường dẫn của mọi route quản trị. Là ranh giới duy nhất để phân biệt
 * API admin với API client — `swagger.config.ts` dựa vào đây để tách tài liệu,
 * và middleware sau này (rate limit, IP allowlist) cũng chỉ cần khớp tiền tố này.
 */
export const ADMIN_ROUTE_PREFIX = 'admin';

/**
 * Khai báo controller quản trị: gắn tiền tố `admin/`, tag Swagger riêng và
 * `@ApiBearerAuth()` — route admin luôn cần token nên không việc gì phải lặp lại
 * ở từng method.
 *
 * @param path đường dẫn tài nguyên, KHÔNG kèm `admin/` (vd: `'products'`)
 * @param tag tên nhóm hiển thị trên Swagger (vd: `'Products'`)
 */
export const AdminController = (path: string, tag: string): ClassDecorator =>
    applyDecorators(
        Controller(`${ADMIN_ROUTE_PREFIX}/${path}`),
        ApiTags(`Admin - ${tag}`),
        ApiBearerAuth(),
    );
