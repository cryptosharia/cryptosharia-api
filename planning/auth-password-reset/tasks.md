# Tasks: auth-password-reset

## Allowed Files

- `src/routes/auth/index.ts`
- `src/routes/auth/password/forgot/+server.ts`
- `src/routes/auth/password/reset/+server.ts`
- `src/routes/auth/password/password-reset.test.ts`
- `src/routes/auth/signup/+server.ts`
- `src/routes/auth/verify/+server.ts`
- `src/routes/auth/verify/verify.test.ts`
- `src/routes/openapi.json/registry.ts` (only if explicit registration changes are needed)
- `src/lib/auth/tokens.ts`
- `src/lib/db/tables.ts`
- `src/lib/db/relations.ts` (if needed for relation completeness)
- `src/lib/db/schema/auth.ts` (if exports need update)
- `drizzle.config.ts`
- `drizzle/**` (generated migration artifacts if created)
- `src/lib/services/email.ts` (only if helper changes are required)
- `src/routes/seed/demo/+server.ts`
- `src/lib/api-types.ts`
- `planning/auth-password-reset/spec.md`
- `planning/auth-password-reset/tasks.md`

## Constraints

- Keep auth semantics explicit: validation `400`, invalid/expired reset token `404`, internal failures `500`.
- Do not leak account existence on forgot endpoint.
- Do not store plaintext reset tokens in DB.
- Do not store plaintext auth tokens in DB.
- Do not weaken existing signin/signup/refresh semantics.
- Keep public API contract updates inside `src/routes/auth/index.ts` first (contract-first).

## Implementation Checklist

- [x] Add forgot/reset schemas + RouteConfig in `src/routes/auth/index.ts`.
- [x] Add unified `auth_tokens` DB model with `type` and `tokenHash` in `src/lib/db/tables.ts`.
- [ ] Add migration to support unified table and email-verification data transition.
- [x] Update signup + verify flows to issue/consume `auth_tokens` with `type='email_verification'`.
- [x] Implement `POST /auth/password/forgot` handler.
- [x] Implement `POST /auth/password/reset` handler.
- [x] Revoke all active refresh tokens after successful password reset.
- [x] Add integration tests for forgot/reset happy and negative paths.
- [x] Update verify integration tests as needed to cover hashed-token flow.
- [x] Regenerate API types.
- [x] Run verification commands.

## Escalation Triggers

- Need to alter auth architecture invariants beyond approved unified token model.
- Need to change password policy rules beyond agreed scope.
- Need to introduce non-trivial rate limiting model changes.
- Same blocker fails implementation more than 2 times.

## Definition of Done

- [ ] All acceptance criteria in `spec.md` are satisfied.
- [x] `npm run gen:api-types`, `npm run check`, `npm run lint`, and `npm test` pass.
- [x] Changed files stay within this allowlist (or deviations documented).
- [x] Execution log and final report updated.

## Execution Log

- 2026-03-08: Planning pack created for forgot+reset-only scope.
- 2026-03-08: Updated plan to use unified hashed `auth_tokens` table for both email verification and password reset.
- 2026-03-08: Implemented unified `auth_tokens` schema and relations, plus token hashing helper in auth token utilities.
- 2026-03-08: Updated signup/verify flows to issue and consume hashed `email_verification` tokens via unified table.
- 2026-03-08: Added `POST /auth/password/forgot` and `POST /auth/password/reset` routes with generic forgot response and refresh-token revocation on reset.
- 2026-03-08: Added password reset integration tests and updated verify tests to hashed-token behavior.
- 2026-03-08: Regenerated API types and ran verification (`npm run check`, `npm run lint`, `npm test`).

## Final Report

- Files changed: `src/routes/auth/index.ts`, `src/routes/auth/password/forgot/+server.ts`, `src/routes/auth/password/reset/+server.ts`, `src/routes/auth/password/password-reset.test.ts`, `src/routes/auth/signup/+server.ts`, `src/routes/auth/verify/+server.ts`, `src/routes/auth/verify/verify.test.ts`, `src/lib/auth/tokens.ts`, `src/lib/db/tables.ts`, `src/lib/db/relations.ts`, `src/lib/db/schema/auth.ts`, `src/routes/seed/demo/+server.ts`, `src/lib/api-types.ts`, `planning/auth-password-reset/spec.md`, `planning/auth-password-reset/tasks.md`.
- Verification results: `npm run gen:api-types` pass, `npm run check` pass, `npm run lint` pass, `npm test` pass (one initial flaky timeout in ops cleanup test, then full rerun passed).
- Deviations: DB migration artifacts were not generated in this implementation; schema changes are in code and applied in test via `drizzle-kit push --force`.
