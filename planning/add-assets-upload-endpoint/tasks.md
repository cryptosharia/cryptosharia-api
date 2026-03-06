# Tasks: Add Assets Upload Endpoint

## Allowed Files

- `src/routes/assets/index.ts`
- `src/routes/assets/+server.ts`
- `src/routes/assets/assets.test.ts`
- `src/routes/openapi.json/registry.ts`
- `src/lib/services/assets.ts` (only if metadata/url mapping needs adjustment)
- `package.json` (if new dependency required)
- `package-lock.json` (dependency lockfile sync)
- `src/lib/api-types.ts` (if regenerated from OpenAPI)

## Constraints

- Follow contract-first route module flow: update/create `index.ts` schemas and route config before handler behavior.
- Keep auth semantics strict (`401` unauthenticated at hook level, `403` unauthorized permission in route).
- Treat multipart payload as untrusted; do not spread raw payload into DB insert.
- Keep request contract minimal: only accept the `file` part for upload.
- Do not modify DB schema/migrations in this task.
- Do not edit unrelated routes or RBAC role mapping unless escalated and approved.

## Implementation Checklist

- [x] Add `assets` route contract and request/response schemas in `src/routes/assets/index.ts`.
- [x] Implement `POST /assets` handler in `src/routes/assets/+server.ts` with permission gate, upload, and DB write.
- [x] Register `assetsRoutes` in `src/routes/openapi.json/registry.ts`.
- [x] Add integration tests in `src/routes/assets/assets.test.ts` for negative auth/validation paths.
- [x] Add/install any required Vercel Blob dependency and sync lockfile.
- [ ] Regenerate API types if route appears in `src/lib/api-types.ts` workflow.
- [x] Run verification commands and record outcomes.

## Escalation Triggers

- Need to change API contract beyond this spec (request fields, status semantics).
- Need to change permission model or introduce new RBAC permissions.
- Need DB schema/migration changes for additional asset metadata.
- More than 2 failed attempts on the same blocker.

## Definition of Done

- [x] Acceptance criteria from `spec.md` are satisfied.
- [x] `npm run check`, `npm run lint`, and `npm test` pass.
- [x] `Execution Log` and `Final Report` are filled.
- [x] Deviations are explicitly documented (or marked none).

## Execution Log

- 2026-03-06: Created planning pack and paused for approval before implementation.
- 2026-03-06: Implemented `/assets` route contract + handler with Vercel Blob upload, DB persistence, and OpenAPI registry update.
- 2026-03-06: Added `/assets` integration tests (negative-path auth and validation).
- 2026-03-06: Added compensating cleanup (`del`) to remove uploaded blob if DB insert fails.
- 2026-03-06: Ran verification commands: `npm run check`, `npm run lint`, `npm test` (all pass).

## Final Report

- Files changed: `src/routes/assets/index.ts`, `src/routes/assets/+server.ts`, `src/routes/assets/assets.test.ts`, `src/routes/openapi.json/registry.ts`, `package.json`, `package-lock.json`, `planning/add-assets-upload-endpoint/spec.md`, `planning/add-assets-upload-endpoint/tasks.md`
- Test/check results: `npm run check` pass, `npm run lint` pass, `npm test` pass (26 files, 137 tests)
- Deviations from spec: Success-path upload integration test omitted intentionally to avoid creating real blob artifacts in automated runs.
