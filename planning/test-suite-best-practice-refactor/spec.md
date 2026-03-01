# Spec: Test Suite Best-Practice Refactor

## Objective

Refactor the API test suite to improve reliability, maintainability, and coverage completeness while preserving existing API behavior and security semantics.

## Scope

- In scope: test harness hardening, test utility improvements, duplication reduction in route integration tests, and missing endpoint coverage for existing routes.
- Out of scope: functional API behavior changes, DB schema/migration changes, auth/RBAC policy changes, and production runtime architecture changes unrelated to testing.

## Architecture Decisions

- Keep integration-first strategy (real HTTP requests against running app + real test DB) as the primary confidence layer.
- Preserve strict auth semantics in tests (`401` unauthenticated, `403` forbidden) and expand negative-path assertions where coverage is thin.
- Introduce reusable integration-test helpers/scenario builders for repeated list/detail/filter/security assertions to reduce drift across posts/tokens/users/messages suites.
- Keep test data creation explicit and whitelisted through factories in `src/lib/test-utils.ts`; avoid hidden side effects in tests.
- Harden the test runner script for deterministic failure behavior and cleanup guarantees.

## Contracts

### Input

- Existing API routes and contracts remain unchanged.
- Test harness inputs remain `.env.test`-driven.

### Output

- Test suite remains green under `npm test` with stricter and clearer assertions.
- New/updated tests cover previously untested endpoints and key negative/security paths.
- Shared test helpers reduce duplicated setup/assertion logic in large route suites.

### Validation Rules

- No public API contract changes are allowed in this refactor.
- Any discovered contract mismatch must be escalated and planned separately before route behavior edits.
- New tests must assert status codes and critical response shape fields, not just happy-path existence checks.

## Behavior Rules

- Keep tests deterministic and isolated; each test must not depend on execution order.
- Maintain current DB cleanup guarantees for isolation, while reducing avoidable overhead where possible.
- Ensure script exits non-zero on any setup, server startup, or test failure.
- Ensure cleanup runs reliably even when tests fail.

## Edge Cases

- Server fails to boot within timeout in test script.
- Database create/drop operations fail or become unavailable.
- Concurrent refresh/signin/signout flows that rely on token revocation/rotation semantics.
- Endpoints with mixed auth modes (public + private behavior) and rate-limit interactions.

## Risks and Mitigations

- Risk: Refactor introduces flaky tests.
  Mitigation: Preserve integration boundaries, avoid timing-sensitive assertions, and run full suite repeatedly during verification.
- Risk: Shared helpers hide important test intent.
  Mitigation: Keep helpers small/composable and keep endpoint-specific assertions in each test file.
- Risk: Test harness hardening accidentally changes runtime assumptions.
  Mitigation: Restrict script changes to failure handling, startup checks, and cleanup behavior only.
- Risk: Missing coverage remains despite refactor.
  Mitigation: Add an explicit route-to-test coverage checklist in tasks and close gaps (`/imgbb`, `/tokens/quotes`, `/seed/demo` decision).

## Acceptance Criteria

- [x] `scripts/test-e2e.sh` is hardened for deterministic failure and cleanup behavior.
- [x] Route test duplication for posts/tokens is reduced via shared helpers without losing coverage depth.
- [x] Missing route coverage is addressed for `/imgbb` and `/tokens/quotes`; `/seed/demo` is either tested or explicitly documented as intentionally excluded.
- [x] Auth/security-focused negative-path coverage is added where currently shallow.
- [x] Test suite remains contract-safe (no API contract changes introduced by test refactor work).
- [x] `npm run check`, `npm run lint`, and `npm test` pass.

## Verification

- `npm run check`
- `npm run lint`
- `npm test`
