# Rules: API, auth & configuration

1. Never wrap responses yourself: `TransformInterceptor` already wraps them in
   `{ success, statusCode, data, timestamp }`. Throw Nest `HttpException`s with Vietnamese messages;
   `AllExceptionsFilter` maps Postgres errors automatically.
2. All input goes through class-validator DTOs. The ValidationPipe runs with
   `whitelist + forbidNonWhitelisted`, so unknown fields return 400. Validate id params with `ParseUUIDPipe`.
3. Routes require login by default. Open them with `@Public()`, restrict them with
   `@RequirePermissions(...)`. New routes do not use `@Roles`.
4. When touching auth, any login rejection must run **before** `issueToken`, because `issueToken` bumps
   the token version and kills the user's current session.
5. Every route has `@ApiOperation`. When the API contract changes, run `npm run docs:all` and say which
   FE is affected (`d-computer-client` uses `openapi.client.yaml`, `d-computer-admin-client` uses
   `openapi.admin.yaml`).
6. A new environment variable must be declared in `config/env.validation.ts`, `config/configuration.ts`
   and `.env.example`. Read it through `ConfigService`, never `process.env` inside a module.
7. Never write secrets into the repo. `docs/` is gitignored because it contains real keys; do not
   un-ignore it.
