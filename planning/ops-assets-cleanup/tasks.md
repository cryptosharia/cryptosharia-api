# Tasks: ops-assets-cleanup

## Allowed Files

- `src/routes/ops/assets/cleanup/index.ts`
- `src/routes/ops/assets/cleanup/+server.ts`
- `src/routes/openapi.json/registry.ts`
- `src/routes/ops/assets/cleanup/assets-cleanup.test.ts`
- `src/hooks.server.ts`
- `src/hooks.server.test.ts`
- `src/lib/api-types.ts`
- `planning/ops-assets-cleanup/spec.md`
- `planning/ops-assets-cleanup/tasks.md`

## Constraints

- Keep endpoint internal-purpose and ops-key guarded via hooks.
- Use static env import for ops key (`$env/static/private`).
- Do not add/delete DB schema or migrations.
- Do not perform cleanup for non-`vercel_blob` providers.
- Keep cleanup idempotent and batch-bounded.
- Do not change unrelated route contracts.

## Implementation Checklist

- [x] Add contract schemas and RouteConfig for `/ops/assets/cleanup` in `index.ts`.
- [x] Implement hooks-level `/ops/*` auth gate requiring `CS_API_KEY_OPS` in `src/hooks.server.ts`.
- [x] Add hooks tests for ops key routing semantics in `src/hooks.server.test.ts`.
- [x] Implement input validation in `+server.ts`.
- [x] Implement orphan asset selector against posts/tokens/users references.
- [x] Implement `dryRun` and real deletion flow (`del(pathname)` + DB row delete).
- [x] Handle upstream "blob not found" as successful orphan cleanup.
- [x] Add integration tests for unauthorized, dry-run, and cleanup success path.
- [x] Register route in `src/routes/openapi.json/registry.ts`.
- [x] Regenerate API types and run verification commands.

## Escalation Triggers

- Need to change auth model beyond `CS_API_KEY_OPS` hooks tiering.
- Need to add schema/migration changes.
- Need to widen reference checks beyond posts/tokens/users.
- Same blocker fails implementation more than 2 times.

## Definition of Done

- [x] All acceptance criteria in `spec.md` are satisfied.
- [x] `npm run gen:api-types`, `npm run check`, `npm run lint`, and `npm test` pass.
- [x] OpenAPI/runtime/types are aligned.
- [x] Execution log and final report are updated.

## Execution Log

- 2026-03-07: Planning pack created; waiting for approval before implementation.
- 2026-03-07: Implemented `/ops/assets/cleanup` contract and handler with orphan filtering, dry-run mode, bounded batch cleanup, and BlobNotFound-as-success behavior.
- 2026-03-07: Updated hooks auth tiering to enforce `CS_API_KEY_OPS` on all `/ops/*` routes while preserving existing private key behavior.
- 2026-03-07: Added integration tests for ops cleanup route and hooks auth tests for `/ops/*` key behavior.
- 2026-03-07: Updated OpenAPI registry, regenerated API types, and ran verification (`npm run gen:api-types`, `npm run check`, `npm run lint`, `npm test`).

## Final Report

- Files changed: `src/routes/ops/assets/cleanup/index.ts`, `src/routes/ops/assets/cleanup/+server.ts`, `src/routes/ops/assets/cleanup/assets-cleanup.test.ts`, `src/hooks.server.ts`, `src/hooks.server.test.ts`, `src/routes/openapi.json/registry.ts`, `src/lib/api-types.ts`, `planning/ops-assets-cleanup/spec.md`, `planning/ops-assets-cleanup/tasks.md`.
- Verification results: `npm run gen:api-types` pass, `npm run check` pass, `npm run lint` pass, `npm test` pass.
- Deviations: none.
