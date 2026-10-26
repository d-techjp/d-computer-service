# d-computer-service

E-commerce backend for D-Tech (computers / electronics, Osaka, Japan). Serves two frontends:
the storefront `../d-computer-client` and the admin back-office `../d-computer-admin-client`.

**Stack:** NestJS 11 (Express) · TypeScript strict · TypeORM 1 + PostgreSQL 17 · Redis (ioredis) ·
JWT (passport-jwt) · class-validator · Joi (env) · Stripe · Resend · Cloudflare R2 · Jest.

## Commands

```bash
npm run db:up && npm run redis:up      # Postgres + Adminer(:8080) + Redis via docker
npm run migration:run && npm run seed  # seed user: admin@dcomputer.local / Admin@123456
npm run start:dev
npm run lint && npm run typecheck && npm test   # run all three before reporting done
npm run docs:all                       # regenerate openapi/*.yaml + postman (needs Postgres up)
```

- API at `http://localhost:<PORT>/api/v1` (the FEs point to **3030** locally). `/health` has no prefix.
- Swagger is split: `/api/docs/client` and `/api/docs/admin`.

## Architecture

```
src/
├── main.ts / app.module.ts   # global guards, interceptors, filter — order matters, see app.module.ts
├── common/                   # decorators, guards, interceptors, filters, BaseEntity, utils
├── config/                   # configuration.ts + env.validation.ts (Joi) + typeorm.config.ts
├── database/                 # data-source (CLI), migrations/, seeds/
├── redis/                    # shared REDIS_CLIENT, keyPrefix `d-computer-service:`
└── modules/<module>/
    ├── client/               # storefront controller + service + NARROW dto/ (`@Controller`)
    ├── admin/                # admin controller (`@AdminController(path, tag)` → /admin/*)
    ├── application/          # core services, business logic shared by both sides
    ├── domain/               # abstract repositories (also the DI tokens)
    ├── infrastructure/       # TypeORM repositories, external SDK gateways
    ├── entities/ dto/ enums/ events/
    └── <module>.module.ts    # { provide: XRepository, useClass: TypeOrmXRepository }
```

Dependency flow: `controller → application service → domain repository ← infrastructure`.
`domain/` never imports from `client/` or `admin/`. Modules with no storefront side (rbac, uploads,
inventory, dashboard) keep their controller flat at the module root and only use `@AdminController`.

### Key business flows (read before changing them)

- **Auth / token version:** the JWT carries `ver`; Redis key `token-version:<userId>` holds the current
  version. Login, password change and logout increment it; logout-all and role change delete it, so each
  user has **one active session**. Losing Redis data logs every user out. `/admin/auth/*` is a separate
  admin gate: it rejects by the role's *permission count* and must reject **before** `issueToken`
  (otherwise it kills the user's storefront session).
- **RBAC:** every route requires login by default. `@Public()` opens a route, `@RequirePermissions(...)`
  restricts it (any one of the listed permissions passes). Role permissions are cached in Redis
  `permissions:role:<code>` with a 1h TTL.
- **Orders** (`orders.service.ts`): an order is created in one transaction that locks variants
  `FOR UPDATE` in id order, deducts stock and snapshots name/price into `order_items`. State machine
  lives in `orders/enums/order.enum.ts`. Bundles: one parent row holds the revenue, plus N child rows
  with `unitPrice=0` (`parentItemId`).
- **Channels & payments:** COD deducts stock at placement. Stripe Checkout (card, PayPay) and POS
  (`in_store`, Stripe Terminal) orders start as `awaiting_payment` with **no stock deducted**; the
  webhook calls `confirmOnlinePayment`, which deducts stock. Out of stock when the money arrives means
  cancel + automatic refund. POS only accepts PaymentIntents with `metadata.channel=in_store`.
  In-store `cash` / `bank_transfer` orders go straight to `completed` + `paid`.
- **Inventory:** `orders` owns deducting/restoring `ProductVariant.stock`; `inventory` is only an
  append-only ledger (`recordInventoryMovement(manager, …)` runs inside the orders transaction). Do not
  move stock ownership.
- **Email:** orders `emit` `ORDER_EVENTS.*` after commit, and `OrderMailListener` sends via Resend.
  Orders never imports mail. Customer mail follows `order.locale` (ja/vi); shop mail is Vietnamese.
- **Dashboard:** queries `orders` directly (no rollup table), revenue counts `completed` only, days are
  grouped in `Asia/Tokyo`.
- **Money:** JPY integers. The 10% consumption tax is **included in prices** (receipts compute the
  inclusive tax, floored).

## Rules

Detailed rules live in `.claude/rules/` (auto-loaded):
`architecture.md` · `database.md` · `api.md` · `code-style-and-size.md`.
Always run `npm run lint && npm run typecheck && npm test` before reporting done.

## Deploy & environment

- Pushing `main` triggers GitHub Actions: build image → Docker Hub → SSH to VPS `/var/www/d-computer`
  → `docker compose pull/up`. **Pushing main deploys to production**, so ask before pushing.
- Prod: port 3030, shares the Postgres container `smsf-db` (database `d_computer_service`); migrations
  run at boot when `DB_RUN_MIGRATIONS=true`. Daily `pg_dump` backup at 03:00 (kept 14 days on the VPS,
  60 days on R2).
- Stripe: Japanese account, JPY, SDK pinned to `^22`. Test webhooks locally with
  `stripe.webhooks.generateTestHeaderString` and a fake secret. There is no `automatic_tax` (Stripe Tax
  is only enabled for Invoices created manually on the Dashboard).
- Test mail without a real Resend key: `RESEND_API_KEY=re_fake`; `[MailSender]` logs show which mails
  were sent.
