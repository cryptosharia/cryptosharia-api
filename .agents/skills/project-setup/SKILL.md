---
name: project-setup
description: Converts a fresh `nest new` project into the standardized Bun + Fastify + Drizzle ORM + Zod + OpenAPI (Scalar) + Vitest stack. Removes the Nest CLI, Express, and Jest; sets path aliases and package scripts; configures Fastify bootstrap, global Zod validation, Drizzle and OpenAPI base modules, a base users module, the Vitest harness, and Docker (dev/test/prod). Use when initializing or rebooting core application infrastructure.
---

# Project Setup

Transforms a fresh `@nestjs/cli new` scaffold into the target stack: **Bun,
Fastify, Drizzle ORM, Zod, OpenAPI/Scalar, Vitest**.

## Layout

- `assets/` — all verbatim-output templates, mirrored from their target path
  (Docker, configs, env, `src/*`, `test/*`). Copy each to its matching location.

## Steps

Work through in order:

### 1. Dependencies, scripts, ESLint, and TypeScript aliases

#### Uninstall the default tooling and adapter

```bash
bun remove @nestjs/cli @nestjs/schematics @nestjs/platform-express jest ts-jest @types/jest ts-node source-map-support supertest @types/supertest
```

Delete `nest-cli.json`, `tsconfig.build.json`, `src/**/*.spec.ts`,
`src/app.service.ts`, `test/jest-e2e.json`, `test/app.e2e-spec.ts`.

#### Install runtime dependencies

Keep the shipped `@nestjs/common`, `@nestjs/core`, `reflect-metadata`, `rxjs`.
Add:

```bash
bun add @nestjs/platform-fastify @nestjs/config @nestjs/jwt @fastify/static
bun add zod drizzle-orm drizzle-zod pg @asteasolutions/zod-to-openapi yaml dotenv
```

#### Install development dependencies

```bash
bun add -d @nestjs/testing @types/node @types/pg drizzle-kit vitest openapi-fetch openapi-typescript
```

#### Replace the `scripts` block

Delete `start:prod`, `start:debug`, `test`, `test:e2e`. Keep `format` and `lint`.

```jsonc
"start": "bun src/main.ts",
"start:dev": "bun --watch src/main.ts",
"test:unit": "vitest run --project unit",
"test:e2e": "vitest run --project e2e",
"test:gen-schema": "bun test/generate-schema.ts",
"db:studio": "drizzle-kit studio",
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate"
```

#### ESLint

Replace `...globals.jest` with `...globals.vitest`

#### TypeScript path aliases

In `tsconfig.json`, add `baseUrl` and `paths`; remove build-only flags
(`declaration`, `removeComments`, `sourceMap`, `outDir`, `incremental`):

```jsonc
"baseUrl": "./",
"paths": { "#src/*": ["./src/*"], "#test/*": ["./test/*"] }
```

### 2. Environment files and validation

1. Make sure the project `.gitignore` contains the following:

   ```gitignore
   .env
   .env.*
   !.env.example
   !.env.test
   ```

2. Copy `assets/.env.example` to `<project>/.env.example`.
3. Copy `assets/.env.test` to `<project>/.env.test`, replacing `<app_name>` (snake_case) with the project name.
4. Copy `assets/src/env.validation.ts` to `<project>/src/env.validation.ts`.

### 3. Drizzle module

1. Copy `assets/drizzle.config.ts` and `assets/drizzle.config.test.ts` to the
   `<project>/` root.
2. Copy these four files to `<project>/src/modules/drizzle/`:
   - `assets/src/modules/drizzle/drizzle.schema.ts`
   - `assets/src/modules/drizzle/drizzle.types.ts`
   - `assets/src/modules/drizzle/drizzle.service.ts`
   - `assets/src/modules/drizzle/drizzle.module.ts`

### 4. Fastify bootstrap and global infrastructure

Copy these files to their mirrored locations:

- `assets/src/main.ts` → `<project>/src/main.ts`
- `assets/src/app.module.ts` → `<project>/src/app.module.ts`
- `assets/src/app.exception-filter.ts` → `<project>/src/app.exception-filter.ts`
- `assets/src/zod.exception-filter.ts` → `<project>/src/zod.exception-filter.ts`
- `assets/static/robots.txt` → `<project>/static/robots.txt`
- `assets/static/.well-known/security.txt` → `<project>/static/.well-known/security.txt`
- `assets/src/types/vitest.d.ts` → `<project>/src/types/vitest.d.ts`
- `assets/src/common/parse-zod.pipe.ts` → `<project>/src/common/parse-zod.pipe.ts`
- `assets/src/common/create-error-response.ts` → `<project>/src/common/create-error-response.ts`
- `assets/src/common/create-responses-config.ts` → `<project>/src/common/create-responses-config.ts`
- `assets/src/common/error-response.schemas.ts` → `<project>/src/common/error-response.schemas.ts`

### 5. System module

Copy these two files to `<project>/src/modules/system/`:

- `assets/src/modules/system/system.controller.ts`
- `assets/src/modules/system/system.module.ts`

### 6. OpenAPI module (Scalar)

Copy these three files to `<project>/src/modules/openapi/`:

- `assets/src/modules/openapi/openapi.registry.ts`
- `assets/src/modules/openapi/openapi.controller.ts`
- `assets/src/modules/openapi/openapi.module.ts`

Replace the `<App Name>` placeholder in `openapi.registry.ts` with the
project name.

### 7. Base `users` feature module

Copy these nine files to `<project>/src/modules/users/`:

- `assets/src/modules/users/users.schemas.ts`
- `assets/src/modules/users/users.error.ts`
- `assets/src/modules/users/users.exception-filter.ts`
- `assets/src/modules/users/exclude-password.interceptor.ts`
- `assets/src/modules/users/users.repository.ts`
- `assets/src/modules/users/users.service.ts`
- `assets/src/modules/users/users.controller.ts`
- `assets/src/modules/users/users.openapi.ts`
- `assets/src/modules/users/users.module.ts`

### 8. Vitest harness

1. Copy `assets/vitest.config.ts` to the `<project>/` root.
2. Copy these files to `<project>/test/`:
   - `assets/test/app.e2e-spec.ts` → `<project>/test/app.e2e-spec.ts`
   - `assets/test/setup.ts` → `<project>/test/setup.ts`
   - `assets/test/main.ts` → `<project>/test/main.ts`
   - `assets/test/generate-schema.ts` → `<project>/test/generate-schema.ts`
   - `assets/test/helpers/context.type.ts` → `<project>/test/helpers/context.type.ts`
   - `assets/test/helpers/suite.base.ts` → `<project>/test/helpers/suite.base.ts`
   - `assets/test/helpers/reset-test-database.ts` → `<project>/test/helpers/reset-test-database.ts`
   - `assets/test/suites/index.ts` → `<project>/test/suites/index.ts`
   - `assets/test/suites/users.suite.ts` → `<project>/test/suites/users.suite.ts`

3. Replace the `<App Name>` placeholders in `<project>/test/generate-schema.ts` with the project values.

### 9. Docker

Copy these static templates to the `<project>/` root: `assets/Dockerfile`,
`assets/docker-compose.yml`, `assets/docker-compose.test.yml`,
`assets/docker-compose.prod.yml`, and `assets/.dockerignore`. Replace the
`<app-name>` and `<app_name>` (use kebab-case for `<app-name>` and snake_case for `<app_name>`) placeholder in the compose files with the project name.

---

## Verification

1. Run `bun install`.
2. Run `bun run lint` & `bun run format`.
