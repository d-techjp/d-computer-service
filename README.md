# D-Computer Service

Backend thương mại điện tử viết bằng **NestJS 11 (Express) + TypeORM 1 + PostgreSQL 17**.

## Tech stack

| Thành phần   | Lựa chọn                                       |
| ------------ | ---------------------------------------------- |
| Framework    | NestJS 11, platform-express                    |
| Ngôn ngữ     | TypeScript 5.9 (strict)                        |
| ORM          | TypeORM 1.x + migration (không dùng synchronize) |
| Database     | PostgreSQL 17                                  |
| Cache/Session | Redis (ioredis) — lưu token version           |
| Auth         | JWT (passport-jwt) + token version trên Redis  |
| Phân quyền   | RBAC lưu DB: role ↔ permission (n-n)           |
| Validate     | class-validator / class-transformer + Joi cho env |
| Docs         | Swagger tại `/api/docs`                        |
| Test         | Jest                                           |

## Khởi động nhanh

```bash
cp .env.example .env          # sửa JWT_SECRET thành chuỗi ngẫu nhiên >= 32 ký tự
npm install
npm run db:up                 # Postgres 17 + Adminer (localhost:8080) qua Docker
npm run redis:up              # Redis 7 — bỏ qua nếu đã có Redis riêng, chỉ cần sửa REDIS_HOST/PORT
npm run migration:run         # tạo schema
npm run seed                  # admin + danh mục/thương hiệu/sản phẩm/bài viết mẫu
npm run start:dev
```

- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api/docs`
- Health (không versioned, dùng cho probe): `http://localhost:3000/health`
- Tài khoản seed: `admin@dcomputer.local` / `Admin@123456`

## OpenAPI & Postman

Toàn bộ 9 module (72 endpoint) có sẵn cả OpenAPI spec lẫn Postman collection, sinh trực tiếp
từ decorator `@Api...` trong code — **không phải viết tay** nên luôn khớp API thật.

```bash
npm run db:up                 # cần Postgres đang chạy (TypeOrmModule kết nối lúc app khởi tạo)
npm run docs:openapi          # -> openapi/openapi.json, openapi/openapi.yaml
npm run docs:postman          # đọc openapi.json -> postman/D-Computer-Service.postman_collection.json
# hoặc gộp cả hai bước:
npm run docs:all
```

| File | Việc |
| --- | --- |
| [openapi/openapi.json](openapi/openapi.json) / `.yaml` | OpenAPI 3.0 đầy đủ — import vào Postman/Insomnia, generate SDK, hoặc dùng trực tiếp |
| [postman/D-Computer-Service.postman_collection.json](postman/D-Computer-Service.postman_collection.json) | Postman Collection v2.1, gom theo tag (Auth, Users, Products…) |
| [postman/D-Computer-Service.Local.postman_environment.json](postman/D-Computer-Service.Local.postman_environment.json) | Environment mẫu: `baseUrl`, `accessToken`, `adminUsername`, `adminPassword` |

**Cách dùng trong Postman:** import cả 2 file trên, chọn environment "D-Computer Service - Local",
chạy request **Login** trong folder `Auth` — test script của request này tự đọc `accessToken` từ
response và lưu vào biến environment; mọi request cần đăng nhập khác dùng sẵn
`Authorization: Bearer {{accessToken}}` nên chạy được ngay, không phải copy tay token.
Request **Logout** cũng có script tự xoá `accessToken` khỏi environment sau khi gọi thành công —
đúng với cơ chế token version: gọi Logout xong thì token đó hết dùng được, kể cả trong Postman.

Đã verify bằng [Newman](https://github.com/postmanlabs/newman) (CLI chạy Postman collection):
login xong gọi thẳng route bảo vệ trả **200**, không cần set header thủ công.

Muốn regenerate sau khi sửa API: chạy lại `npm run docs:all` (cần server hoặc ít nhất Postgres
đang chạy vì script dựng cả `AppModule` để lấy đúng route đã áp `globalPrefix`/`versioning`).

## Cấu trúc thư mục

```
openapi/            # sinh bởi `npm run docs:openapi` — openapi.json / openapi.yaml
postman/             # sinh bởi `npm run docs:postman` — collection + environment mẫu
scripts/
├── export-openapi.ts  # dựng AppModule, ghi OpenAPI document ra file (không listen())
└── generate-postman.ts # convert openapi.json -> Postman collection, gắn script auto-login
src/
├── main.ts                   # bootstrap: helmet, cors, ValidationPipe, versioning, swagger
├── swagger.config.ts         # DocumentBuilder dùng chung giữa main.ts và export-openapi.ts
├── app.module.ts             # đăng ký global guard / interceptor / filter
├── config/                   # configuration, validate env (Joi), options TypeORM dùng chung
├── database/
│   ├── data-source.ts        # DataSource riêng cho TypeORM CLI
│   ├── migrations/           # migration sinh từ entity
│   ├── seeds/seed.ts         # dữ liệu khởi tạo
│   └── snake-naming.strategy.ts
├── common/                   # dùng chung mọi module
│   ├── decorators/           # @Public, @Roles, @CurrentUser, @LogActivity
│   ├── dto/                  # PaginationQueryDto, PaginatedResult
│   ├── entities/             # BaseEntity, SoftDeletableEntity
│   ├── filters/              # AllExceptionsFilter (map lỗi Postgres -> HTTP)
│   ├── guards/               # JwtAuthGuard, RolesGuard
│   ├── interceptors/         # TransformInterceptor, ActivityLogInterceptor
│   ├── transformers/         # numeric transformer, transform helpers cho DTO
│   └── utils/                # slugify, parseDuration, resolveSortColumn
└── modules/
    ├── auth/                 # đăng ký, đăng nhập, logout, đổi mật khẩu, token version store
    ├── rbac/                 # role, permission, gán quyền (nguồn phân quyền)
    ├── users/                # CRUD user, hash password, profile
    ├── categories/           # danh mục nhiều cấp (cha-con)
    ├── brands/               # thương hiệu
    ├── products/             # sản phẩm, tồn kho, lọc/tìm kiếm
    ├── articles/             # bài viết / tin tức
    ├── orders/               # đơn hàng + order items + máy trạng thái
    ├── activity-logs/        # nhật ký hoạt động
    ├── uploads/              # upload ảnh lên Cloudflare R2 (S3-compatible)
    └── health/               # health check
```

## Cơ chế auth & token version

Yêu cầu: mật khẩu hash bằng bcrypt, login trả JWT, token version lưu trên **Redis**,
login tăng version, logout tăng version.

Cách hoạt động:

1. `POST /auth/login` → xác thực mật khẩu (bcrypt) → `tokenVersionStore.increment(userId)`
   → ký JWT với claim `ver` = version vừa tăng.
2. Mỗi request có Bearer token: `JwtStrategy` verify chữ ký + hạn dùng, rồi
   `AuthService.verifyTokenVersion()` so `payload.ver` với version đang lưu.
   Lệch version hoặc không còn bản ghi → `401`.
3. `POST /auth/logout` → tăng version thêm 1 → token đang cầm lập tức vô hiệu.
4. `POST /auth/change-password` cũng cấp token mới (version tăng), token cũ hết hiệu lực.
5. `POST /auth/logout-all` → xoá hẳn bản ghi version.

**Hệ quả cần biết** (đúng như thiết kế yêu cầu, không phải bug):

- Mỗi user chỉ giữ **một phiên hoạt động**. Đăng nhập ở thiết bị B sẽ đá thiết bị A ra.
- Version nằm trên Redis nên **restart service không đá user ra**, và chạy được **nhiều
  instance** mà không cần sticky session.
- Redis chết thì không xác thực được request nào → `/health` báo `redis: down`.

Cài đặt: [redis-token-version.store.ts](src/modules/auth/token-version/redis-token-version.store.ts),
khớp abstract class [token-version.store.ts](src/modules/auth/token-version/token-version.store.ts)
(cũng là DI token) — muốn đổi backend chỉ cần thay provider trong
[auth.module.ts](src/modules/auth/auth.module.ts).

Key có dạng `d-computer-service:token-version:{userId}`, TTL lấy theo `JWT_EXPIRES_IN`
(hết hạn token thì bản ghi cũng hết ý nghĩa, để Redis tự dọn). Biến môi trường:
`REDIS_HOST`, `REDIS_PORT`.

## Phân quyền (RBAC)

Role và permission nằm **trong database**, không hard-code: `roles` ↔ `permissions`
quan hệ n-n qua `role_permissions`, mỗi user giữ **một** role (`users.role_id`).
Admin tạo role mới và gán quyền tuỳ ý qua API mà không cần sửa code.

`JwtAuthGuard` + `PermissionsGuard` đăng ký global — **mặc định mọi route đều cần đăng nhập**.
Mở public bằng `@Public()`, giới hạn quyền bằng `@RequirePermissions(PermissionCode.PRODUCT_MANAGE)`
(nhiều permission = thoả **một** trong số đó là qua). `@Roles(RoleCode.ADMIN)` vẫn dùng được
cho các route cần khoá theo đúng role hệ thống.

Permission theo module (phase này chưa tách theo từng API) — danh sách code trong
[permission.enum.ts](src/common/enums/permission.enum.ts), cũng là dữ liệu seed cho bảng `permissions`:

| Permission                | Route được mở                                  |
| ------------------------- | ---------------------------------------------- |
| `dashboard.view`          | Số liệu tổng quan                              |
| `product.manage`          | Ghi/xoá sản phẩm, upload ảnh                   |
| `product.category.manage` | Ghi/xoá danh mục                               |
| `product.brand.manage`    | Ghi/xoá thương hiệu                            |
| `inventory.manage`        | Điều chỉnh tồn kho, xem cảnh báo sắp hết hàng  |
| `articles.manage`         | Ghi/xuất bản/xoá bài viết, upload ảnh          |
| `orders.manage`           | Xem toàn bộ đơn, đổi trạng thái đơn/thanh toán |
| `user.customer.manage`    | Xem danh sách/chi tiết user                    |
| `user.admin.manage`       | Tạo/sửa/xoá user                               |
| `user.role.manage`        | Toàn bộ `/roles`, `/permissions`, gán vai trò  |
| `logs.view`               | Activity log toàn hệ thống                     |

`GET` products/categories/brands/articles vẫn public; đặt hàng và xem đơn của mình chỉ
cần đăng nhập.

### API

| Endpoint                        | Mô tả                                             |
| ------------------------------- | ------------------------------------------------- |
| `GET /auth/permissions`         | Permission của chính mình — client lưu vào storage |
| `GET /roles` `POST /roles`      | Danh sách / tạo vai trò                            |
| `GET /roles/options`            | **Rút gọn cho dropdown** (id/code/name/isSystem)   |
| `PATCH` `DELETE /roles/:id`     | Sửa (không đổi `code`) / xoá mềm                   |
| `PUT /roles/:id/permissions`    | Gán quyền cho vai trò (`permissionCodes`) — ghi đè toàn bộ |
| `GET /permissions`              | Danh sách permission, lọc theo module              |
| `GET /permissions/options`      | **Rút gọn cho dropdown**, gom sẵn theo module      |
| `POST` `PATCH` `DELETE /permissions` | Tạo / sửa / xoá permission                    |
| `PUT /users/:id/role`           | Gán vai trò cho user (`roleCode`)                  |

**Hiệu lực của thay đổi:**

- Đổi permission **của một role** → áp dụng ngay cho mọi user thuộc role đó, không cần
  đăng nhập lại (key cache `permissions:role:{code}` bị xoá khi ghi).
- Đổi **vai trò của một user** → token đang cầm bị **thu hồi** (vì role nằm trong JWT),
  user phải đăng nhập lại. Chủ ý như vậy để việc hạ quyền có hiệu lực tức thì. Cũng vì thế
  `PATCH /users/:id` **không** đổi được vai trò — chỉ `PUT /users/:id/role` làm được.

Mọi API phân quyền đều nhận **code** (`"staff"`, `"product.manage"`) thay vì UUID cho dễ đọc;
`GET /roles/options` và `GET /permissions/options` trả sẵn code để đổ vào dropdown.

Ba role hệ thống (`admin`, `staff`, `customer`) được seed với `is_system = true` nên không
xoá được; role còn user đang dùng cũng bị chặn xoá (`users.role_id` là FK `RESTRICT`).

## Định dạng response

Thành công (bọc bởi `TransformInterceptor`):

```json
{
    "success": true,
    "statusCode": 200,
    "data": { "...": "..." },
    "timestamp": "2026-08-02T07:00:00.000Z"
}
```

Danh sách có phân trang thì `data` là `{ items: [...], meta: { page, limit, total, totalPages, hasNextPage, hasPreviousPage } }`.

Lỗi (bọc bởi `AllExceptionsFilter`):

```json
{
    "success": false,
    "statusCode": 400,
    "message": "Dữ liệu đầu vào không hợp lệ",
    "errors": ["property hacker should not exist"],
    "path": "/api/v1/auth/register",
    "method": "POST",
    "timestamp": "2026-08-02T07:00:00.000Z"
}
```

Filter map sẵn lỗi Postgres: `23505` → 409, `23503`/`23502`/`22P02` → 400.

## Đơn hàng

Tạo đơn chạy trong **một transaction** với `SELECT ... FOR UPDATE` trên các sản phẩm
(khoá theo thứ tự id để tránh deadlock): kiểm tra tồn kho → trừ kho → ghi đơn.
Đã kiểm chứng: 12 request đặt hàng song song trên sản phẩm còn 10 → đúng 10 đơn thành công,
2 đơn bị từ chối, tồn kho về 0 chứ không âm.

Order item lưu **snapshot** tên/SKU/giá tại thời điểm đặt, nên sửa hoặc xoá sản phẩm sau này
không làm đổi nội dung đơn cũ.

Máy trạng thái ở [order.enum.ts](src/modules/orders/enums/order.enum.ts):

```
pending ──▶ confirmed ──▶ processing ──▶ shipping ──▶ completed ──▶ refunded
   │            │              │             │
   └────────────┴──────────────┴─────────────┴──▶ cancelled
```

Huỷ đơn sẽ hoàn kho trong cùng transaction. Khách chỉ tự huỷ được đơn `pending`;
admin/staff huỷ được ở các trạng thái còn lại.

## Upload ảnh (Cloudflare R2)

`thumbnail`/`images` của sản phẩm và bài viết là các field URL string (validate bằng
`@IsUrl()`) — API tạo/sửa product/article **không đổi**. Ảnh được upload qua endpoint riêng
trước, nhận về URL công khai, rồi mới gắn URL đó vào body khi gọi `POST /products` hoặc
`POST /articles` như bình thường.

**Vì sao tách endpoint riêng thay vì nhét file thẳng vào `POST /products`:** cho phép người
dùng upload/preview ảnh trước khi submit form, dùng chung được cho cả product lẫn article
(và cả update sau này), và không phải trộn JSON body với `multipart/form-data` trong cùng
một request (class-validator + file trong multipart rất khó validate sạch).

| Endpoint | Field | Ghi chú |
| --- | --- | --- |
| `POST /uploads/images?folder=products\|articles` | `file` | 1 ảnh, trả `{ url, key, originalName, mimeType, size }` |
| `POST /uploads/images/multiple?folder=products\|articles` | `files` | Tối đa 10 ảnh/lần, trả mảng theo đúng thứ tự đã gửi |

Cả hai yêu cầu role `admin`/`staff`, tối đa **5MB/ảnh**, chỉ nhận `jpeg/png/webp/gif`
(cố tình loại SVG — có thể nhúng script, rủi ro XSS khi hiển thị trực tiếp).

```bash
curl -X POST "http://localhost:3000/api/v1/uploads/images?folder=products" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@laptop-dell.jpg;type=image/jpeg"
# -> { "url": "https://pub-xxxx.r2.dev/products/<uuid>.jpg", "key": "products/<uuid>.jpg", ... }

curl -X POST http://localhost:3000/api/v1/products \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name": "...", "sku": "...", "price": 100000, "thumbnail": "https://pub-xxxx.r2.dev/products/<uuid>.jpg"}'
```

**Cấu hình** (`.env`, xem thêm `.env.example`): `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` (domain public — bật Public Access
cho bucket rồi lấy `*.r2.dev`, hoặc gắn custom domain cho production). Các biến này **không
bắt buộc lúc app khởi động** — cố tình để vậy nên môi trường dev/test không đụng tới ảnh vẫn
chạy bình thường. Khi thật sự gọi endpoint upload mà thiếu cấu hình, API trả `503` với thông
báo rõ ràng thay vì app crash lúc boot hoặc lỗi khó hiểu từ AWS SDK.

Object key sinh dạng `${folder}/${uuid}.${ext}` (uuid ngẫu nhiên, không dùng tên file gốc của
người dùng) — tránh trùng, tránh path traversal qua tên file.

## Activity logs

Hai đường ghi log:

1. **Tự động** — gắn `@LogActivity({ action, resource })` lên handler. `ActivityLogInterceptor`
   ghi lại user, action, resource, resourceId, method, path, status code, thời gian xử lý, IP,
   user-agent và body (đã che `password`, `token`, `secret`… thành `***`).
   Handler không gắn decorator thì không ghi, tránh làm ngập bảng log.
2. **Thủ công** — inject `ActivityLogsService` rồi gọi `record()` (best-effort, lỗi ghi log
   không làm hỏng request) hoặc `create()`. Auth dùng cách này để ghi login/logout/đổi mật khẩu
   kèm ngữ cảnh riêng.

Bảng `activity_logs` là append-only, có index theo `(user_id, created_at)`, `(resource, resource_id)`
và `created_at`. `purgeOlderThan(days)` để dọn log cũ theo lịch vận hành.

## Scripts

| Lệnh                                                  | Việc                              |
| ----------------------------------------------------- | --------------------------------- |
| `npm run start:dev`                                   | chạy dev, watch mode              |
| `npm run build` / `npm run start:prod`                | build và chạy bản production       |
| `npm run typecheck`                                   | `tsc --noEmit`                    |
| `npm run lint` / `npm run format`                     | ESLint (--fix) / Prettier         |
| `npm test` / `npm run test:cov`                       | unit test / coverage              |
| `npm run migration:generate -- src/database/migrations/TenMigration` | sinh migration từ entity |
| `npm run migration:run` / `migration:revert` / `migration:show` | chạy / rollback / xem migration |
| `npm run seed`                                        | seed dữ liệu mẫu                  |
| `npm run db:up` / `npm run db:down`                   | bật/tắt Postgres bằng Docker      |
| `npm run redis:up`                                    | bật Redis bằng Docker             |
| `npm run docs:openapi` / `docs:postman` / `docs:all`  | xuất OpenAPI + sinh Postman collection |

## Quy ước code

- Prettier: **4 space**, single quote, print width 100 (xem `.prettierrc`, `.editorconfig`).
- Entity kế thừa `BaseEntity` (uuid + timestamps) hoặc `SoftDeletableEntity` (thêm `deleted_at`).
- Tên bảng/cột trong DB là `snake_case` nhờ `SnakeNamingStrategy`; code vẫn viết `camelCase`.
- Cột tiền dùng `numeric(14,2)` + `ColumnNumericTransformer` để trả về `number` thay vì string.
- Slug tự sinh từ tên (bỏ dấu tiếng Việt), trùng thì nối hậu tố `-2`, `-3`…
- `sortBy` luôn đi qua allowlist `resolveSortColumn` để chặn SQL injection.
- `ValidationPipe` bật `whitelist` + `forbidNonWhitelisted`: client gửi field lạ sẽ bị 400.

## Việc nên làm tiếp

- Chuyển `TokenVersionStore` sang Redis trước khi chạy nhiều instance.
- Thêm refresh token nếu muốn giữ phiên dài mà vẫn để access token TTL ngắn.
- Rate limit cho `/auth/login` (`@nestjs/throttler`).
- Xoá object trên R2 khi sản phẩm/bài viết bị xoá hoặc ảnh bị thay — hiện `uploads` chỉ có
  chiều ghi, object cũ trở thành rác mồ côi nếu không dọn thủ công.
- Thanh toán online, mã giảm giá, đánh giá sản phẩm.
