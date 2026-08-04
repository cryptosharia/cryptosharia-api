---
name: drizzle
description: Applies the standard Drizzle ORM conventions for PostgreSQL tables, enums, relationships, and derived Zod entity schemas in src/modules/drizzle.
---

# Drizzle

Defines the database-schema conventions for the Drizzle ORM layer under
`src/modules/drizzle/`.

This skill owns database table definitions, PostgreSQL enums,
foreign-key relationships, and derived entity schemas.

## File Responsibilities

**`src/modules/drizzle/drizzle.schema.ts`**

- Owns PostgreSQL table definitions, enums, indexes, constraints, and foreign
  keys.
- Uses Drizzle `pg-core` primitives (`pgTable`, `uuid`, `text`, `timestamp`,
  `pgEnum`, etc.).
- Keeps table exports lower camel and plural when they represent tables
  (e.g. `users`, `tasks`).
- Keeps enum exports lower camel and singular by domain concept (e.g. `taskStatus`).

**`src/modules/drizzle/drizzle.types.ts`**

- Owns app-level entity schemas derived from Drizzle tables with
  `createSelectSchema`.
- Exports PascalCase Zod schemas and matching TypeScript types (`Task`, `User`).
- Adds field-level Zod validation and metadata (`description`, `example`)
  for entity fields.
- Stays focused on entity schemas. Request/response DTO variants live in feature
  module `<name>.schemas.ts` files.

## Table Standards

- Declare `id`, `createdAt`, and `updatedAt` directly inside each table that uses
  the lifecycle column convention.
- Use ``uuid('id').primaryKey().default(sql`uuidv7()`)`` for primary ids.
- Use snake_case database column names and camelCase TypeScript property names.
- Define enums before tables that use them.
- Define foreign keys with explicit `.references(() => otherTable.id)` calls.
- Keep relationship ownership visible in the table shape (`userId`, `projectId`,
  etc.).

## Derived Entity Schema Standards

- Create one exported schema per table with `createSelectSchema(table, overrides)`.
- Export the TypeScript type from the schema with `z.infer<typeof Entity>`.
- Place field validation closest to the field in the `createSelectSchema`
  override object.
- Add `.meta({ description, example })` for fields exposed through API responses
  or request schemas.
- Do not define controller body/param DTOs in `drizzle.types.ts`; derive those in
  the feature module from these entity schemas.

## Reference Implementation

`assets/example/` contains concrete reference versions of `drizzle.schema.ts`
and `drizzle.types.ts`. Use them as style references for direct lifecycle
columns, enum placement, foreign keys, `createSelectSchema`, validation, and metadata.

## Change Propagation

Drizzle changes must keep dependent layers consistent:

- Table added or removed: update `drizzle.types.ts` and any feature module that
  uses the entity.
- Column added, removed, renamed, nullable-change, or type-change: update the
  matching derived schema, feature module DTO schemas, repositories, OpenAPI
  docs, and tests.
- Enum value changed: update derived schemas, OpenAPI docs, service logic,
  and tests that assert allowed values.
- Relationship changed: update repositories, service ownership checks, guards,
  and E2E tests that depend on access boundaries.

## Migration Safety

Migration generation and application are developer-operated.

After changing Drizzle schema files, report the schema files changed and the
developer-facing migration commands to run when ready:

```bash
bun run db:generate
bun run db:migrate
```

## Operational Rules

- Inspect the current `drizzle.schema.ts` and `drizzle.types.ts` before editing.
- Preserve existing table names, enum names, and column names unless the task is
  explicitly a rename.
- Make the smallest schema change that satisfies the requested domain change.
- Keep Drizzle table definitions and derived entity schemas in sync in the same
  pass.
