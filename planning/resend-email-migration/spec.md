# Spec: resend-email-migration

## Objective

Replace Google Apps Script email delivery with Resend for transactional flows (`/messages`, signup verification, and password reset) before production launch.

## Scope

- In scope: replace provider implementation in `src/lib/services/email.ts` from GAS webhook proxy to direct Resend API.
- In scope: keep existing route contracts and behavior unchanged for:
  - `POST /messages`
  - `POST /auth/signup` (verification send)
  - `POST /auth/password/forgot` (reset send)
- In scope: standardize `notify` query support across all email-sending endpoints (`/messages`, `/auth/signup`, `/auth/password/forgot`) with default `true`.
- In scope: add/rename private environment variables required for Resend and remove GAS dependency from docs/examples.
- In scope: add automated tests for email service behavior (success + provider failure handling) without making real network calls.
- In scope: keep existing route integration tests centered on `notify=false` usage for deterministic test runs.
- In scope: ensure logging/error handling do not leak secrets or tokens.
- Out of scope: email template redesign, localization, queueing infrastructure, webhook ingestion, and analytics dashboards.

## Architecture Decisions

- Keep a single email boundary at `src/lib/services/email.ts`; routes continue calling `sendEmail(...)`.
- Use official Resend Node SDK for typed API calls and clearer provider error handling.
- Preserve current route-level semantics:
  - `/auth/password/forgot` still returns generic success even if email is not registered.
  - `/messages` notify path remains non-blocking via `waitUntil(...)`.
  - signup and forgot handlers continue swallowing provider failures where currently intended.
- Keep provider-specific details out of route handlers (subject/body composition can stay in handlers for now).

## Contracts

### API Endpoints

- Minimal contract update: add `notify` query schema to `POST /auth/password/forgot` to align with existing `notify` support in `/messages` and `/auth/signup`.
- Request/response status codes and body shapes remain unchanged.

### Internal Email Service Contract

- `sendEmail({ to, subject, html })` remains the stable call shape for current consumers.
- Implementation switches from `fetch(GAS_URL, ...)` to Resend SDK call.
- Service throws on provider-level failure so caller behavior stays explicit and testable.

### Environment Contract

- Replace `GAS_URL` usage with Resend-specific env vars:
  - `RESEND_API_KEY`
  - `RESEND_FROM`
  - optional `RESEND_REPLY_TO` (if needed for contact flow)

## Behavior Rules

- Email service must fail fast when required env vars are missing.
- Email service must not log API keys, reset tokens, verification tokens, or raw provider response bodies containing sensitive details.
- `/messages` with `notify=true` still persists message even if notification send fails asynchronously.
- `/auth/signup`, `/messages`, and `/auth/password/forgot` respect `notify` query with default `true`.
- Auth flows keep current security behavior and token lifecycle unchanged.

## Edge Cases

- Missing/invalid Resend credentials in non-test environments.
- Resend API transient failure (5xx / network timeout).
- Invalid recipient address returned by provider.
- HTML content containing user input remains escaped in callers (existing `escapeHtml` behavior retained).

## Risks and Mitigations

- Risk: startup/runtime failures due to missing env vars.
  Mitigation: explicit env validation in email service and clear error messages.
- Risk: silent delivery regressions after provider switch.
  Mitigation: add focused tests + monitor staging logs for send success/failure during rollout.
- Risk: accidental sensitive logging.
  Mitigation: sanitize logging and avoid dumping provider payloads.

## Acceptance Criteria

- [ ] `src/lib/services/email.ts` sends through Resend instead of GAS.
- [ ] No runtime references to `GAS_URL` remain.
- [ ] `.env.example` documents required Resend variables.
- [ ] `POST /auth/password/forgot` contract includes optional `notify` query (default `true`) and runtime honors it.
- [ ] Existing email-triggering routes continue working with unchanged response semantics (only planned contract addition: forgot-password `notify` query).
- [ ] Existing route test coverage remains stable with `notify=false` semantics; no `notify=true` requirement added.
- [ ] Security audit checklist passes for secrets, auth flow safety, and error/log hygiene.

## Verification

- `npm run check`
- `npm run lint`
- `npm test`
