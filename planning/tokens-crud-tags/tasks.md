# Tasks: tokens-crud-tags

## Allowed Files

- `src/routes/tokens/index.ts`
- `src/routes/tokens/+server.ts`
- `src/routes/tokens/[id]/+server.ts`
- `src/lib/services/tokens.ts`
- `src/routes/tokens/tokens.write.test.ts`
- `src/lib/api-types.ts`
- `planning/tokens-crud-tags/spec.md`
- `planning/tokens-crud-tags/tasks.md`

## Constraints

- Keep route contracts in `index.ts` as source of truth.
- Keep auth semantics strict: `401` unauthenticated, `403` forbidden.
- Do not auto-create tags from token write payload.
- Do not mass-assign request payloads into DB writes.
- Keep existing `/tokens/quotes` behavior unchanged.
- Do not modify unrelated modules unless required for passing global gates; document any deviation.

## Implementation Checklist

- [x] Add write schemas and RouteConfig entries for token create/update/delete in `src/routes/tokens/index.ts`.
- [x] Implement `POST /tokens` in `src/routes/tokens/+server.ts` with permission, validation, and tag mapping.
- [x] Implement `PATCH /tokens/{id}` and `DELETE /tokens/{id}` in `src/routes/tokens/[id]/+server.ts`.
- [x] Add/reuse token helper functions in `src/lib/services/tokens.ts` for identifier and tag resolution.
- [x] Add integration tests in `src/routes/tokens/tokens.write.test.ts` for success and negative paths.
- [x] Regenerate API types in `src/lib/api-types.ts`.
- [x] Run verification gates and resolve failures.

## Escalation Triggers

- Contract changes beyond this spec scope are needed.
- Security/auth behavior must deviate from this spec.
- Required edits exceed allowed files.
- Same blocker fails implementation more than 2 times.

## Definition of Done

- [x] All acceptance criteria in `spec.md` are satisfied.
- [x] `npm run check`, `npm run lint`, and `npm test` pass.
- [x] OpenAPI contracts, runtime behavior, and generated API types are aligned.
- [x] Tasks and execution log are updated with final status.

## Execution Log

- 2026-03-07: Planning pack created; waiting for approval before implementation.
- 2026-03-07: Added token write contracts in `src/routes/tokens/index.ts` and write handlers in `src/routes/tokens/+server.ts` and `src/routes/tokens/[id]/+server.ts`.
- 2026-03-07: Added token identifier/tag-resolution helpers in `src/lib/services/tokens.ts`.
- 2026-03-07: Added write integration tests in `src/routes/tokens/tokens.write.test.ts`.
- 2026-03-07: Regenerated API types via `npm run gen:api-types` and verified with `npm run check`, `npm run lint`, and `npm test`.

## Final Report

- Files changed: `src/routes/tokens/index.ts`, `src/routes/tokens/+server.ts`, `src/routes/tokens/[id]/+server.ts`, `src/lib/services/tokens.ts`, `src/routes/tokens/tokens.write.test.ts`, `src/lib/api-types.ts`, `planning/tokens-crud-tags/spec.md`, `planning/tokens-crud-tags/tasks.md`.
- Verification results: `npm run check` pass, `npm run lint` pass, `npm test` pass.
- Deviations: none.
