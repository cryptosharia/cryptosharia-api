---
name: cryptosharia-api-route-implementation
description: Standard way to implement or update CryptoSharia API routes with contract-first mapping, auth checks, and verification
---

# CryptoSharia API Route Implementation

## When to use

Use this skill when adding or modifying route handlers in `src/routes/**/+server.ts`.

## Workflow

1. Define/update the route contract in the module root `index.ts` first
   - Zod schemas for params/query/body/response
   - OpenAPI RouteConfig aligned with schema names

2. Implement handler logic with security gates
   - Explicit auth/authorization checks where required
   - Ownership checks for user-owned resources
   - No mass assignment from request bodies

3. Return schema-driven responses
   - Map payloads via Zod parse (whitelist)
   - Expand metadata through shared helpers where available
   - Do not leak internal fields or upstream internal error bodies

4. Verify quality gates
   - `npm run check`
   - `npm run lint`
   - `npm test`

## Done definition

- Contract in OpenAPI + Zod is updated and consistent
- Handler follows security checklist in `.agents/rules/security-audit.md`
- Tests/checks pass for changed scope
