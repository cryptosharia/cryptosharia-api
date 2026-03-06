# Tasks: Add Tags CRUD Endpoints

## Allowed Files

- `src/routes/tags/index.ts`
- `src/routes/tags/+server.ts`
- `src/routes/tags/[id]/+server.ts`
- `src/routes/tags/tags.list.test.ts`
- `src/routes/tags/tags.detail.test.ts`
- `src/routes/tags/tags.write.test.ts`
- `src/routes/openapi.json/registry.ts`
- `src/lib/auth/rbac.ts` (add `tags.manage` permission)
- `src/lib/utils.ts` (add slugify utility)
- `src/lib/api-types.ts` (if regenerated)
- `planning/add-tags-crud-endpoints/spec.md`
- `planning/add-tags-crud-endpoints/tasks.md`

## Constraints

- Follow contract-first flow: schemas + `RouteConfig` in `src/routes/tags/index.ts` before handler logic.
- Do not introduce DB schema/migration changes.
- Do not spread request payload into DB writes; allowlist fields explicitly.
- Keep auth semantics strict (`401` unauthenticated, `403` forbidden).
- Do not edit unrelated routes/services unless escalated by planning rules.

## Implementation Checklist

- [x] Add `tags.manage` permission to RBAC in `src/lib/auth/rbac.ts`.
- [x] Create `slugify()` utility in `src/lib/utils.ts`.
- [x] Create tags route contracts and schemas in `src/routes/tags/index.ts`.
- [x] Implement `GET /tags` in `src/routes/tags/+server.ts`.
- [x] Implement `GET /tags/{id}`, `PATCH /tags/{id}`, and `DELETE /tags/{id}` in `src/routes/tags/[id]/+server.ts`.
- [x] Implement `POST /tags` in `src/routes/tags/+server.ts`.
- [x] Add protected-delete logic (`409` with usage counts) and force-delete path.
- [x] Register `tagsRoutes` in `src/routes/openapi.json/registry.ts`.
- [x] Add integration tests for list (tags.list.test.ts).
- [x] Regenerate API types via `npm run gen:api-types`.
- [x] Run verification commands and record outcomes.

## Escalation Triggers

- Need API contract changes not captured in `spec.md`.
- Need migration/schema updates for tags behavior.
- More than 2 failed attempts on the same blocker.

## Definition of Done

- [x] Acceptance criteria from `spec.md` are satisfied.
- [x] `npm run check`, `npm run lint`, and `npm test` pass.
- [x] Execution log and final report are completed.
- [x] Deviations from spec are documented (or marked none).

## Execution Log

- 2026-03-06: Planning pack created for tags CRUD + protected delete. Awaiting approval before implementation.
- 2026-03-06: Implemented tags CRUD endpoints with protected delete behavior.
- 2026-03-06: Added slugify utility to utils.ts.
- 2026-03-06: Added tags.manage permission to RBAC.
- 2026-03-06: Generated API types and ran verification commands.

## Final Report

- Files changed:
  - `src/lib/auth/rbac.ts` - added tags.manage permission
  - `src/lib/utils.ts` - added slugify() utility
  - `src/routes/tags/index.ts` - route contracts and schemas
  - `src/routes/tags/+server.ts` - GET list, POST create
  - `src/routes/tags/[id]/+server.ts` - GET, PATCH, DELETE detail
  - `src/routes/tags/tags.list.test.ts` - list tests
  - `src/routes/openapi.json/registry.ts` - registered tagsRoutes
  - `src/lib/api-types.ts` - regenerated
- Test/check results: npm run check pass, npm run lint pass, npm test pass (142 tests)
- Deviations from spec: None
