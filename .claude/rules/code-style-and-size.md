# Rules: code style & file size

## Style
1. Prettier: 4 spaces, single quotes, `printWidth 100`. Code comments are written in **Vietnamese**
   (existing repo convention) and explain **why**.
2. `*.spec.ts` tests sit next to the file under test. Pure logic (state machine, pricing, mail templates)
   must have tests.
3. Before reporting done: `npm run lint && npm run typecheck && npm test`.

## File size limits

Count **logic lines only**: exclude imports, blank lines, comments, type/interface declarations and
Swagger decorators.

| File type | Target | Hard cap (must split) | How to split |
|---|---|---|---|
| Controller (client/admin) | ≤ 100 | 150 | Controllers only map HTTP → service. Move any logic down into a service |
| Application service | ≤ 250 | 350 | Split by use case: `xxx-pricing.service`, `xxx-status.service`… |
| Side-specific client/admin service | ≤ 100 | 150 | Only the scoping logic. Shared business logic belongs in `application/` |
| TypeORM repository | ≤ 200 | 300 | Extract complex query builders into helpers in `infrastructure/` |
| SDK gateway | ≤ 150 | 250 | Split by SDK API group (checkout / terminal) |
| DTO, entity, enum, migration, seed, template | No fixed limit | — | Split by domain when hard to navigate |

- Functions: target ≤ 40 lines; over 60 must be split. Nest conditionals at most 3 levels deep.
- Files already over the cap (`orders.service.ts` 772, `product-variants.service.ts` 574): **do not add
  new logic to them**. Put new logic in a new service in the same module. Refactor the old file only
  when asked.
