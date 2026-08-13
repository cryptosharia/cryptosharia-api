---
name: feature-module
description: Applies the standard architecture, naming, validation, domain error, repository/service/controller layering, and OpenAPI conventions for NestJS feature resource modules under src/modules resource directories.
---

# Feature Module

Defines the standard architecture, naming, validation, error handling, and
OpenAPI conventions for NestJS feature resource modules under
`src/modules/<name>/`.

`assets/example/` is a concrete reference implementation for a
full authenticated persistent resource module.

## Directory Architecture

A full persistent feature resource module uses this standard shape:

```
src/modules/<name>/
├── <name>.module.ts            # NestJS module declaration
├── <name>.controller.ts        # HTTP routes, decorators, pipe validation
├── <name>.service.ts           # Pure business logic layer
├── <name>.repository.ts        # Pure Drizzle database query layer
├── <name>.schemas.ts           # Zod request/response DTO schemas
├── <name>.error.ts             # Domain error class and error code union
├── <name>.exception-filter.ts  # Controller filter translating domain errors to HTTP exceptions
└── <name>.openapi.ts           # Prefixed <name>RouteConfig for OpenAPI docs
```

Modules may be smaller when the domain does not need persistence, custom domain
errors, authentication, or route documentation. Do not add layers that the module
does not use.

## Layer Standards

**Controller**

- Owns HTTP decorators, route paths, guards, filters, status codes, and request
  validation.
- Validates untrusted input once at the HTTP entry with `ParseZodPipe` in
  handler parameters.
- Resolves authenticated user context with `@CurrentUser()` from the project's
  security module contract.
- Does not contain business rules or Drizzle queries.

**Service**

- Owns business workflow and coordinates repositories.
- Does not import Drizzle tables or run direct database queries.
- Does not import or throw NestJS HTTP exceptions.

**Repository**

- Owns Drizzle database queries only.
- Accepts strongly typed inputs from services; does not re-validate with zod.
- Throws custom domain errors (`<Name>Error`) for domain failures such as
  not-found or conflict cases.
- Maps database constraint failures into domain errors. For example, for Postgres unique
  violations (`23505`), throw a module-specific `*_UNIQUE_VIOLATION` error.
- Does not import or throw NestJS HTTP exceptions.

**Schemas**

- Live in `<name>.schemas.ts`.
- Derive DTO schemas from `#src/modules/drizzle/drizzle.types` when the module is
  backed by a database table.
- Use `.pick()`, `.omit()`, or `.partial()` to create request/response schemas.
- Include param schemas for route params and response schemas for OpenAPI.

**Domain Errors and Filters**

- Domain errors live in `<name>.error.ts` as a `<NAME>_ERRORS` code-to-message
  map, an error-code union derived from its keys, and a `<Name>Error` class.
- Use entity-prefixed domain codes for resource failures, such as
  `<ENTITY>_NOT_FOUND`, rather than generic codes like `NOT_FOUND`.
- `<Name>Error` stores the selected code on `code` and passes the mapped message
  to `super(...)`.
- Exception filters live in `<name>.exception-filter.ts` and map domain errors
  to HTTP exceptions.
- Exception filters send `{ error: exception.code, message: exception.message }`.
- Controllers apply the filter with `@UseFilters(<Name>ExceptionFilter)`.

**OpenAPI**

- Route docs live in `<name>.openapi.ts`.
- Export a prefixed lower-camel `<name>RouteConfig: RouteConfig[]` constant.
- Document every controller handler: method, path, params, body, success status,
  validation errors, auth errors, and domain errors.
- Build route responses with `createResponsesConfig` from
  `#src/common/create-responses-config`.
- Build domain error response schemas with `createErrorResponse(ERRORS, codes)`
  from `#src/common/create-error-response`, using the module's error map as the
  source of truth for both `error` and `message`.
- Build authenticated route `401` response docs with `APP_ERRORS.UNAUTHORIZED`
  and `UnauthorizedResponse` from `#src/common/error-response.schemas`.
- Use `APP_ERRORS.VALIDATION_FAILED` and `ValidationFailedResponse` from
  `#src/common/error-response.schemas` for Zod validation responses.
- Use `APP_ERRORS.FORBIDDEN` and `ForbiddenResponse` from
  `#src/common/error-response.schemas` only for generic 403 failures. Use module
  error maps for business authorization failures such as access-required cases.
- Register the route config in `src/modules/openapi/openapi.registry.ts` by
  importing it and adding it to the `routes` array.

## Change Propagation

Module changes must keep connected files consistent:

- Controller path/method/body/param changes update `<name>.schemas.ts`,
  `<name>.openapi.ts`, and related tests.
- Schema changes update controllers, OpenAPI docs, and service/repository input
  types as needed.
- Domain error code changes update `<name>.exception-filter.ts` and OpenAPI error
  responses.
- Module dependency changes update `<name>.module.ts` and, when new modules are
  introduced, `src/app.module.ts`.
- Route contract changes require `bun run test:gen-schema`.

## Reference Implementation

`assets/example/` contains a complete authenticated persistent `tasks` module.
Use it as the concrete reference for file structure, layering, route
documentation, domain errors, and module wiring.

When creating a missing full persistent resource module, copy the reference files into `<project>/src/modules/<name>/` and adapt names to the target entity:

- filename `tasks.<ext>` → `<name>.<ext>`
- identifier `tasks` → `<name>` (paths, table references, imports)
- identifier `Tasks` → `<Name>` (class names, prefix, error name)

Remove or adjust auth/user-scoping, repository methods, schemas, error codes,
and OpenAPI entries according to the module's domain.

## Operational Rules

- Inspect existing module files before editing.
- Preserve the module's current shape unless the task requires a structural
  change.
- Do not regenerate or overwrite unrelated layers.
- For partial work, update only the affected layer and the connected files listed
  in Change Propagation.
- For missing full resource modules, use `assets/example/` as the scaffold
  reference.
