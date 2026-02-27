# Tasks: Add Tags to Posts and Tokens Routes

## Allowed Files

- `src/routes/posts/index.ts`
- `src/routes/posts/+server.ts`
- `src/routes/posts/[id]/+server.ts` (only if mapping adjustments are needed)
- `src/routes/posts/posts.test.ts`
- `src/routes/tokens/index.ts`
- `src/routes/tokens/+server.ts`
- `src/routes/tokens/[id]/+server.ts` (only if mapping adjustments are needed)
- `src/routes/tokens/tokens.test.ts`
- `src/lib/services/posts.ts`
- `src/lib/services/tokens.ts`
- `src/lib/api-types.ts`

## Constraints

- Keep query parameter name exactly `tags`.
- Treat `tags` query values as tag slugs.
- Keep existing auth and status filtering semantics unchanged.
- Do not introduce DB schema/migration changes.
- Keep responses schema-driven (no raw relation pass-through without whitelist parse).

## Implementation Checklist

- [x] Update post route contracts in `src/routes/posts/index.ts`.
- [x] Add `tags` to `PostsGetQuery`.
- [x] Add reusable tag response schema and include it in `PostsGetItem` and `PostsGetData`.
- [x] Update token route contracts in `src/routes/tokens/index.ts`.
- [x] Add `tags` to `TokensGetQuery`.
- [x] Add reusable tag response schema and include it in `TokensGetItem` and `TokensGetData`.
- [x] Update `GET /posts` runtime query in `src/routes/posts/+server.ts`.
- [x] Load tags relation with whitelisted fields.
- [x] Add tags filter (`tags` query) with OR semantics.
- [x] Update `fetchPostDetail` in `src/lib/services/posts.ts` to include mapped tags.
- [x] Update `GET /tokens` runtime query in `src/routes/tokens/+server.ts`.
- [x] Load tags relation with whitelisted fields.
- [x] Add tags filter (`tags` query) with OR semantics.
- [x] Update `fetchTokenDetail` in `src/lib/services/tokens.ts` to include mapped tags.
- [x] Add/adjust integration tests in posts/tokens route test files.
- [x] Response includes tags for list and detail endpoints.
- [x] Filter returns only matching items.
- [x] Non-matching tag query returns empty items list.
- [x] Regenerate API types and confirm `src/lib/api-types.ts` updates.
- [x] Run verification commands.

## Escalation Triggers

- Need to change OR semantics to AND semantics for `tags` filter.
- Need to expose extra tag fields beyond `id`, `name`, `slug`.
- Required edits fall outside allowed files.
- Same blocker fails implementation more than 2 times.

## Definition of Done

- [x] All acceptance criteria in `spec.md` are satisfied.
- [x] `npm run check` passes.
- [ ] `npm run lint` passes.
- [x] `npm test` passes.
- [x] `Execution Log` is updated during implementation.
- [x] `Final Report` is completed.

## Execution Log

- 2026-02-27: Planning pack created; awaiting approval before implementation.
- 2026-02-27: Implemented contract and runtime updates for tags in posts/tokens list+detail routes.
- 2026-02-27: Added integration coverage for tags response fields, filtering behavior, and non-matching queries.
- 2026-02-27: Synced generated API types after contract changes.
- 2026-02-27: Verification run: `npm run check` and `npm test` passed; `npm run lint` failed due to pre-existing unused `request` variable in `src/routes/seed/demo/+server.ts`.

## Final Report

- Files changed: `src/routes/posts/index.ts`, `src/routes/posts/+server.ts`, `src/lib/services/posts.ts`, `src/routes/posts/posts.test.ts`, `src/routes/tokens/index.ts`, `src/routes/tokens/+server.ts`, `src/lib/services/tokens.ts`, `src/routes/tokens/tokens.test.ts`, `src/lib/api-types.ts`
- Test/check results: `npm run check` pass, `npm test` pass, `npm run lint` fail (pre-existing issue in `src/routes/seed/demo/+server.ts`)
- Deviations from spec: _none_
