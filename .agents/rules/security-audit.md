# Security Audit Checklist

Run this checklist before finalizing work that touches auth, user data, DB writes, caching, or API responses.

## 1) Secrets and Credentials

- No secrets in committed files (`.env`, keys, token dumps, credential files).
- No secrets in browser-visible code or `PUBLIC_` environment variables.
- No sensitive tokens in logs, errors, or test snapshots.

## 2) Auth and Authorization

- Private routes remain gated by valid `Api-Key`.
- Route-level auth requirements are explicit and consistent (`401` vs `403`).
- Permission and ownership checks exist where required.
- Refresh token flow remains one-time atomic consume/rotate (replay-safe).

## 3) Trust Boundary and Rate Limiting

- Client IP source of truth is `event.locals.clientIp` from `hooks.server.ts`.
- Forwarded header parsing occurs only in `src/lib/api/trust-boundary.ts`.
- Private-only rate limiting remains after API key validation.
- Routes/services do not directly trust forwarding headers.

## 4) Write Safety

- No mass assignment from `request.json()` into DB writes.
- Allowed fields are explicitly whitelisted.
- Prefer Drizzle query builder/parameterized APIs over raw string SQL.

## 5) Data Exposure and Error Handling

- Responses do not include sensitive fields (password hashes, refresh token records, secrets).
- Responses are schema-driven (Zod parse/whitelist) for externally exposed payloads.
- Internal exception details are not returned to clients.
- Upstream/provider raw error bodies are sanitized before returning.

## 6) Logging and Caching

- Logs avoid secrets and unnecessary PII.
- Sensitive or user-specific responses use `cache-control: no-store` when appropriate.
- Cache policy is explicit for non-sensitive endpoints.

## 7) Type Safety and Verification

- Avoid `any` for untrusted inputs; use `unknown` with narrowing.
- Add regression tests for fixed security bugs.
- Final gates: `npm run check`, `npm run lint`, `npm test`.

## Audit Report Format

- Findings: `<none>` or bullet list with `path`, `risk`, and `fix`.
- Residual risk: explicit statement if anything is intentionally deferred.
