# Tasks: Dynamic Content Categories

## Allowed Files

- `cryptosharia-api/src/lib/db/tables.ts`
- `cryptosharia-api/src/lib/db/types.ts`
- `cryptosharia-api/src/routes/tags/index.ts`
- `cryptosharia-api/src/routes/tags/+server.ts`
- `cryptosharia-api/src/routes/tags/[id]/+server.ts`
- `cryptosharia-api/src/routes/tags/*.test.ts`
- `cryptosharia-api/drizzle/**`
- `cryptosharia-api/planning/dynamic-content-categories/**`
- `cryptosharia-admin/src/routes/(app)/tags/**`
- `cryptosharia-admin/src/lib/api-types.ts`
- `cryptosharia-media/src/lib/api/**`
- `cryptosharia-media/src/lib/config.ts`
- `cryptosharia-media/src/routes/+layout.*`
- `cryptosharia-media/src/lib/components/Header.svelte`
- `cryptosharia-media/src/routes/berita/**`
- `cryptosharia-media/src/routes/edukasi/**`

## Constraints

- Use an additive migration only; do not modify or delete existing tag/post/token data.
- Keep API contracts, Zod schemas, runtime handlers, tests, and generated client types aligned.
- Keep write fields explicitly whitelisted and retain existing permission checks.
- Do not reveal API keys to the browser.
- Do not edit unrelated files.

## Implementation Checklist

- [x] Add tag category metadata and create an additive Drizzle migration.
- [x] Update tag API contracts, filtering, ordering, and response mapping.
- [x] Add success and validation/authorization regression tests.
- [ ] Regenerate admin API types after the API contract is available.
- [x] Add admin controls for category visibility, section, and order.
- [x] Load categories server-side in media and use them in navigation and category filters.
- [ ] Run API, admin, and media verification commands. (Blocked by unavailable local Docker/database and existing missing environment/dependency setup.)
- [ ] Deploy the approved changes to the relevant preview environments for admin testing.

## Escalation Triggers

- A different public API contract or a non-additive migration is required.
- More than two attempts fail on the same verification blocker.
- Required files fall outside the allowed list.

## Definition of Done

- [ ] Acceptance criteria in `spec.md` are satisfied.
- [ ] Verification commands pass or blockers are documented.
- [ ] No destructive data operation was performed.
- [ ] Deployment URLs for testing are reported.

## Execution Log

- 2026-08-16: Planning pack created; awaiting approval before implementation.
- 2026-08-16: Implemented additive schema, API, admin controls, and media consumption. Media check/build pass.
- 2026-08-16: Local migration cannot connect because the configured local database role is unavailable; E2E tests cannot start because Docker is unavailable.

## Final Report

- Files changed: pending approval.
- Test/check results: pending approval.
- Deviations from spec: none.
