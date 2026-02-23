# Endpoint Behavior Summary (Human + Test-Based)

This is a human-readable summary of what each endpoint is expected to do, based on the current integration tests.

It is intentionally short and practical: what works, what is blocked, and what to expect.

## Global Access Rules

- Most API endpoints require `Api-Key`.
- Authenticated user endpoints also require `Authorization: Bearer <token>`.
- Public exceptions: `/` and `/openapi.json`.

## Docs + Platform

### `GET /`

- Shows API docs page.
- Public access.

### `GET /openapi.json`

- Returns OpenAPI JSON.
- Public access.

### Hook/API-key behavior (from tests)

- Invalid or missing API key is rejected (`401`) on protected routes.
- Valid API key is accepted.

## Auth Endpoints

### `POST /auth/signup`

What it does:

- Registers a normal user account.
- Supports `notify=false` for test/dev flows.

Verified behavior:

- New signup returns `201` and default safe user state (member, unverified).
- Name is trimmed before save.
- Re-signup on unverified email updates that account (graceful re-registration).
- Re-signup on verified email is blocked (`409`).
- Privilege fields in payload (like `role`) are ignored.
- No token leakage in signup response.

### `POST /auth/verify`

What it does:

- Verifies account email using token.

Verified behavior:

- Valid token verifies user and revokes token.
- Invalid/expired token returns `404`.
- User cannot sign in before verification.
- New verification flow revokes old token and keeps latest active token.

### `POST /auth/signin`

What it does:

- Authenticates credentials and returns access + refresh token.

Verified behavior:

- Valid credentials return `200` with tokens.
- Invalid email/password returns `401`.
- Invalid payload returns `400`.
- Refresh token is saved in DB on successful signin.
- Suspended/banned users are blocked (`403`).
- Sensitive user fields are not exposed.

### `POST /auth/refresh`

What it does:

- Rotates refresh token and issues a fresh token pair.

Verified behavior:

- Valid refresh token returns new access + refresh token.
- Old refresh token is revoked.
- Expired/revoked/invalid token returns `401`.
- Suspended/banned users are blocked (`403`).

### `POST /auth/signout`

What it does:

- Revokes refresh token.

Verified behavior:

- Valid token is revoked.
- Non-existent/already revoked token still returns success (`200`, graceful).
- Missing body/token returns `400`.

### `GET /auth/me`

What it does:

- Returns current authenticated user profile.

Verified behavior:

- Valid bearer token returns `200` with role/permissions.
- Missing/invalid/expired/non-existent-user token returns `401`.
- Sensitive fields are hidden.

## Users Endpoints

### `GET /users`

What it does:

- Lists users with pagination/filtering.

Verified behavior:

- Admin can list.
- Supports search, role filter, and status filter.
- Member is blocked (`403`).
- Unauthenticated is blocked (`401`).

### `GET /users/{id}`

What it does:

- Gets user detail by UUID.

Verified behavior:

- User can fetch own profile.
- Admin can fetch any user.
- Member fetching another user is blocked (`403`).
- Unknown user returns `404`.

### `PATCH /users/{id}`

What it does:

- Updates user profile fields.

Verified behavior:

- User can update own profile.
- Admin can update any user.
- Member updating someone else is blocked (`403`).

### `PUT /users/{id}/status`

What it does:

- Changes account status.

Verified behavior:

- Super admin allowed.
- Admin/member blocked (`403`).

### `PUT /users/{id}/role`

What it does:

- Changes user role.

Verified behavior:

- Super admin allowed.
- Admin/member blocked (`403`).

## Posts Endpoints

### `GET /posts`

What it does:

- Lists posts with filters + pagination.

Verified behavior:

- Supports filter by section/search/exclude and combined filters.
- Supports pagination.
- If no match, returns empty list.
- Status visibility rules enforced:
  - Guest default: published only.
  - Guest/member cannot explicitly request draft (`403`).
  - Admin can request draft and can see all statuses.
- List response hides full `content` field.

### `GET /posts/{id}` (slug or UUID)

What it does:

- Gets single post by slug or UUID.

Verified behavior:

- Existing published post is returned.
- Non-existent slug returns `404`.
- Draft post is hidden from guest/member (`404`).
- Admin can access draft by slug and UUID.
- Detail response includes full `content`.
- Cover image payload is normalized (final URL etc.).
- Audit metadata objects are present where available.

## Tokens Endpoints

### `GET /tokens`

What it does:

- Lists tokens with filters + pagination.

Verified behavior:

- Supports filter by sharia status/search/slugs/exclude and combined filters.
- Supports pagination.
- Status visibility rules enforced:
  - Guest default excludes restricted statuses.
  - Guest/member explicit restricted status query is blocked (`403`).
  - Admin can fetch restricted statuses.
- List response hides full `content` field.

### `GET /tokens/{id}` (slug or UUID)

What it does:

- Gets single token by slug or UUID.

Verified behavior:

- Existing published token is returned.
- Non-existent token returns `404`.
- Draft token hidden from guest/member (`404`).
- Admin can access draft by slug and UUID.
- Detail response includes full `content`.
- Logo payload is normalized (final URL etc.).
- Audit metadata objects are present where available.

### `GET /tokens/quotes`

What it does:

- Returns quote/market fields for requested token slugs.

Verified behavior:

- Covered by route contract and endpoint registration.
- (No dedicated integration assertions in current test files yet.)

## Messages Endpoints

### `POST /messages`

What it does:

- Stores contact message, optionally triggers notification.

Verified behavior:

- Valid payload creates message (`201`).
- Invalid email/invalid length/empty message returns `400`.

### `GET /messages`

What it does:

- Lists messages for admin workflow.

Verified behavior:

- Missing API key is blocked (`401`).
- Authorized admin request returns paginated list.
- Supports sender filter, search, and pagination.

## Rate Limit (Cross-cutting)

Verified behavior:

- Rate limit headers are present on successful responses.
- Remaining quota decreases between requests.
- Different `Forwarded-For` values are bucketed separately.

## Related Test Files

- `src/hooks.server.test.ts`
- `src/routes/ratelimit.test.ts`
- `src/routes/auth/signin/signin.test.ts`
- `src/routes/auth/refresh/refresh.test.ts`
- `src/routes/auth/signout/signout.test.ts`
- `src/routes/auth/signup/signup.test.ts`
- `src/routes/auth/verify/verify.test.ts`
- `src/routes/auth/me/me.test.ts`
- `src/routes/users/users.test.ts`
- `src/routes/posts/posts.test.ts`
- `src/routes/tokens/tokens.test.ts`
- `src/routes/messages/messages.test.ts`
