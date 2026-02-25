# Security Audit Checklist

Use this checklist before committing or merging changes.

## Secrets And Env

- No secrets in browser-visible code (`.svelte`, `+page.ts`, `+layout.ts`).
- No secrets in `PUBLIC_` env vars.
- No secrets committed (`.env`, credentials, tokens).

## Auth And Authorization

- Private routes enforce authentication.
- Authorization checks are explicit (role/permission) where required.
- Ownership checks exist for user-owned resources.

## Write Safety

- Do not blindly spread `request.json()` into DB create/update operations.
- Explicitly pick allowed fields and omit sensitive fields.
- Avoid constructing raw SQL strings. Prefer Drizzle query builder/parameterized queries.

## Data Exposure

- Responses do not leak sensitive fields (password hashes, internal tokens, privileged metadata).
- Do not forward upstream error bodies verbatim if they may contain sensitive details.
- API responses are schema-driven (Zod parse/whitelist), not direct DB passthrough.

## Caching

- User-specific or sensitive responses set `cache-control: no-store`.
- Non-sensitive responses have an explicit cache policy.

## Logging

- Do not log secrets.
- Avoid logging PII; if needed, minimize and redact.

## Type Safety

- Avoid `any`.
- Prefer `unknown` + narrowing for untrusted inputs.
