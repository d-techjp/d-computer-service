# Rules: data, migrations & transactions

1. No `synchronize`. Every schema change goes through a migration. `migration:generate` often adds
   unrelated DROP/ADD FK statements (constraint-name drift), so **read the file and strip them** before
   running it. Always write `down()`. Never edit a migration that already ran in production; add a new one.
2. New permission: add it to `common/enums/permission.enum.ts` plus a migration that inserts into
   `permissions` and `role_permissions` (template: `1786300000000-CreateCarousels.ts`). After running it,
   clear the cache with `DEL d-computer-service:permissions:role:admin` (and `:staff`), otherwise users
   get 403 for up to 1h. When inspecting Redis by hand, always include the `d-computer-service:` prefix.
3. Every change to stock or payment state runs in a transaction with row locks (`lockOrder`,
   `pessimistic_write`, locked in id order). The webhook and an admin can race on the same order.
4. Only `orders` may deduct/restore `ProductVariant.stock`. `inventory` only writes ledger rows via
   `recordInventoryMovement(manager, …)` inside the same transaction.
5. Money columns use `numeric` + `ColumnNumericTransformer`. Results from `getRawOne/getRawMany` are
   **strings**, so wrap them in `Number()`.
6. In QueryBuilder use `CAST(x AS text)`, not `x::text` (TypeORM cannot map the column name before `::`).
   Group by day with `AT TIME ZONE 'Asia/Tokyo'` and then `TO_CHAR`.
7. Sensitive columns (`costPrice`, `password`) use `select: false` / `@Exclude()`. Verify suspected data
   leaks with a real request; never conclude from reading code alone.
8. Per-product statistics must filter `parentItemId IS NULL` to skip bundle child rows.
9. Business entities extend `BaseEntity` / `SoftDeletableEntity` (UUID, `timestamptz`). Column names
   are converted to snake_case by `SnakeNamingStrategy`; do not set `name:` by hand.
