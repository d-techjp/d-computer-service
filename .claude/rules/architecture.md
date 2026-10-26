# Rules: architecture & modules

1. Put new endpoints on the right side: storefront → `client/`; admin → `admin/` with `@AdminController`.
   Never share one controller between both sides.
2. A `@Public()` endpoint that filters on a visibility field (status, isActive…) must enforce it in
   **both layers**:
   - The client DTO constrains the value (`@Equals(true)`, `@IsIn(VISIBLE_STATUSES)`). Do not delete a
     field the FE already sends, or it gets a 400.
   - The client service passes the allowed set of states down to the repository.
3. DTOs shared by both sides (especially `Query*Dto`) stay in the module's root `dto/`, because
   `domain/` imports them.
4. Force filters onto a DTO with `Object.assign(query, {...})`. **Never** spread it and **never** use
   `OmitType()`: both drop the `skip` getter of `PaginationQueryDto`.
5. Export only the core services from `application/`. A module that only reads another module's data
   registers that entity with `TypeOrmModule.forFeature([...])` instead of importing the module, to
   avoid circular imports.
6. Side effects in other modules (mail, notifications) go through EventEmitter **after commit**, and
   events carry ids only. Orders never imports mail.
7. An external SDK may only be imported in one gateway under `infrastructure/` (`StripeGateway`,
   `MailSender`, R2). Every write call to Stripe must pass an `idempotencyKey`.
8. Create a side-specific service (client/admin) only when that side has real logic of its own. By
   default the controller calls the core service directly.
