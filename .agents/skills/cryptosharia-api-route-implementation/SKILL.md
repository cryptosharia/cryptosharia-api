---
name: cryptosharia-api-route-implementation
description: Standard way to implement or update CryptoSharia API routes with contract-first mapping, auth checks, and verification
---

# CryptoSharia API Route Implementation

## When to use

Use this skill when adding or modifying route handlers in `src/routes/**/+server.ts`.

## Source of truth

- `.agents/rules/api-rules.md`
- `.agents/rules/security-audit.md`
- `.agents/rules/architecture.md`

## Local supplements

- `rules/flow-constraints.md`
- `references/route-handler-template.md`

## Workflow

1. Define/update the route contract in the module root `index.ts` first
   - Zod schemas for params/query/body/response
   - OpenAPI RouteConfig aligned with schema names
   - If adding a new module, register it in `src/routes/openapi.json/registry.ts`

2. Implement handler logic with security gates
   - Explicit auth/authorization checks where required
   - Ownership checks for user-owned resources
   - No mass assignment from request bodies (`unknown` + schema + field whitelist)

3. Return schema-driven responses
   - Map payloads via Zod parse (whitelist)
   - Expand metadata through shared helpers where available
   - Do not leak internal fields or upstream internal error bodies

4. Update tests for changed behavior
   - Add or update integration tests for status codes and payload shape
   - Add at least one negative-path test for auth/validation/security-sensitive changes

5. Verify quality gates
   - `npm run check`
   - `npm run lint`
   - `npm test`

## Done definition

- Contract in OpenAPI + Zod is updated and consistent
- Handler follows API and security rules from `.agents/rules/`
- Tests/checks pass for changed scope

## Final report format

- Files changed
- Contract changes (if any)
- Test/check results
- Security notes (including `401` vs `403` behavior)
