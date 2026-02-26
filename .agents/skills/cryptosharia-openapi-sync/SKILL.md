---
name: cryptosharia-openapi-sync
description: Keep RouteConfig, OpenAPI registry, runtime responses, and generated API types in sync
---

# CryptoSharia OpenAPI Sync

## When to use

Use this skill whenever endpoint contracts, status codes, request/response schemas, or route modules change.

## Source of truth

- `.agents/rules/api-rules.md`
- `src/routes/openapi.json/registry.ts`
- `src/routes/openapi.json/+server.ts`

## Local supplements

- `rules/typegen-trigger-rules.md`
- `references/openapi-sync-checklist.md`

## Workflow

1. Update contract definitions in route module `index.ts`
   - Zod request/response schemas
   - `RouteConfig` entries

2. Ensure route registry coverage
   - If new module is introduced, register it in `src/routes/openapi.json/registry.ts`

3. Validate runtime and docs alignment
   - Status codes and response messages in `+server.ts` must match OpenAPI descriptions
   - Error semantics must stay consistent (`401` vs `403`)

4. Regenerate API types when needed
   - If local API server is running: `npm run gen:api-types`
   - If using preview contract: `npm run gen:api-types:preview`

5. Run verification gates
   - `npm run check`
   - `npm run lint`
   - `npm test`

## Done definition

- OpenAPI document reflects runtime behavior
- Registry includes all new modules
- Generated types updated if contract changed
- Verification gates pass

## Final report format

- Contract changes by endpoint
- Registry/typegen changes
- Test/check results
