# Spec: auth-password-reset

## Objective

Add secure password recovery endpoints so users can reset forgotten passwords without authenticated access.

## Scope

- In scope: `POST /auth/password/forgot` and `POST /auth/password/reset` contracts, handlers, token persistence, and integration tests.
- In scope: one-time reset token lifecycle (issue -> consume/revoke), password update, and refresh-token revocation after successful reset.
- In scope: migrate email verification token storage/lookup to hashed tokens.
- In scope: OpenAPI + generated API types sync.
- Out of scope: authenticated change-password endpoint, MFA recovery flows, UI/email template redesign, and account lockout policy redesign.

## Architecture Decisions

- Keep contract-first route design in `src/routes/auth/index.ts` before handler implementation.
- Use dedicated route modules:
  - `src/routes/auth/password/forgot/+server.ts`
  - `src/routes/auth/password/reset/+server.ts`
- Use a single unified auth token table for both email verification and password reset tokens.
- Store only hashed auth tokens in DB; never store plaintext tokens.
- Replace current email-verification plaintext token lookup with hash-based lookup.
- Keep forgot-response generic to avoid email/user enumeration.
- On successful reset, revoke all active refresh tokens for that user to invalidate existing sessions.

## Contracts

### Endpoint: `POST /auth/password/forgot`

- Request body:
  - `email: string` (valid email)
- Response:
  - `200` always with generic success message (even when email is not found)
  - `400` validation errors
  - `500` unexpected internal error

### Endpoint: `POST /auth/password/reset`

- Request body:
  - `token: string`
  - `password: string` (min 12; same password policy as signup/signin)
- Response:
  - `200` password updated
  - `400` validation errors
  - `404` invalid/expired/revoked token
  - `500` unexpected internal error

## Data Model

Add unified `auth_tokens` table with:

- `id` UUID primary key
- `userId` UUID FK -> `users.id` (cascade on delete)
- `type` enum (`email_verification`, `password_reset`)
- `tokenHash` string (unique)
- `expiresAt` timestamp
- `revokedAt` timestamp nullable
- `createdAt` timestamp

Rules:

- Token must be one-time use for both token types.
- New forgot requests revoke prior active `password_reset` tokens for that user.
- Signup/re-signup verification issuance revokes prior active `email_verification` tokens for that user.
- Expired or revoked tokens are rejected in both verify/reset flows.

Migration rules:

- Existing `email_verifications` data is migrated safely into `auth_tokens` with `type='email_verification'` and hashed token values.
- Runtime verify flow is switched to read `auth_tokens` only after migration is in place.

## Security Rules

- Forgot endpoint must not reveal whether email exists.
- Auth tokens generated with cryptographically secure random bytes.
- Auth tokens stored hashed (comparison by hash only).
- No secrets/tokens in logs.
- Password update uses existing hashing utility (`hashPassword`).
- Reset success revokes all active refresh tokens for that user.

## Risks and Mitigations

- Risk: user enumeration via forgot endpoint.
  - Mitigation: uniform success response for existing/non-existing emails.
- Risk: token theft/replay.
  - Mitigation: hashed storage + TTL + single-use revocation.
- Risk: migration error affecting email verification.
  - Mitigation: explicit migration/backfill step and integration tests for verify flow post-migration.
- Risk: stale sessions after password reset.
  - Mitigation: revoke refresh tokens for target user in same transaction boundary where feasible.

## Acceptance Criteria

- [ ] `POST /auth/password/forgot` implemented with generic `200` behavior.
- [ ] `POST /auth/password/reset` implemented with one-time token validation and password update.
- [ ] Reset flow revokes all active refresh tokens for affected user.
- [ ] Unified `auth_tokens` persistence model added and used safely (hashed token, type, expiry, revocation).
- [ ] Email verification flow migrated to use hashed tokens via unified table.
- [ ] OpenAPI route configs and runtime responses are aligned.
- [ ] API types regenerated.
- [ ] Integration tests cover happy path and key negatives (invalid token, expired token, malformed input, non-existent email enumeration behavior).

## Verification

- `npm run gen:api-types`
- `npm run check`
- `npm run lint`
- `npm test`
