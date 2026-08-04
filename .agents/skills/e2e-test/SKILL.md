---
name: e2e-test
description: Applies the standard Vitest and openapi-fetch conventions for End-to-End HTTP integration suites under test/suites.
---

# E2E Test

Defines E2E suite conventions for HTTP contract tests. E2E tests use Vitest,
`openapi-fetch`, generated OpenAPI types, the project test database, and modular
suite classes under `test/suites/`.

## Directory Architecture

```
test/
├── app.e2e-spec.ts            # Main test runner that boots Fastify app
├── generate-schema.ts         # Generates test/schema.d.ts from OpenAPI
├── helpers/
│   ├── auth.service.ts        # Auth request helper
│   ├── context.type.ts        # Context with app, baseUrl, typed client
│   ├── reset-test-database.ts # DB reset helper
│   └── suite.base.ts          # Abstract Suite base class
└── suites/
    ├── index.ts               # SuitesService registry
    └── <name>.suite.ts        # Resource suite implementation
```

## Suite Standards

- Each suite extends `Suite` and implements `register()`.
- Define typed request body aliases from `#test/schema` using OpenAPI paths.
- Create small local request helper functions inside `register()`.
- Assert response status first, then assert response data.
- Cover success, validation errors, auth errors, not-found cases, ownership
  boundaries for protected resources, etc.

## Registration Standards

- Register suites in `test/suites/index.ts` through `SuitesService`.
- Instantiate shared helpers once in the `SuitesService` constructor.
- Keep suite registration explicit: `new TaskSuite(ctx, auth)`.
- Do not auto-discover suites; explicit registration keeps test order and
  dependencies visible.

## Reference Implementation

`assets/example/` contains concrete references:

- `tasks.suite.ts` — full authenticated resource suite with create, select,
  update, delete, ownership, validation, auth, not-found, and unique-conflict
  coverage.
- `suites.index.ts` — explicit suite registry pattern.
- `auth.service.ts` — typed auth helper wrapping `openapi-fetch` calls.

Use these files as patterns when adding or updating E2E suites. Preserve the
existing suite shape when editing an existing suite; add only the cases required
by the changed route contract or behavior.

## Verification

1. Run `bun run test:gen-schema` when route contracts changed.
2. Run `bun run test:e2e`.
