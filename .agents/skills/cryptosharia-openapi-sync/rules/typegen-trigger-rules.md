# Typegen Trigger Rules

Use these rules to decide when type generation is required.

## Run Typegen When

- Request/response schema shape changes in route `index.ts`.
- Status codes or operation contracts change.
- New route modules are added to OpenAPI registry.

## Typegen Can Be Skipped When

- Internal implementation changes do not alter external API contract.
- Docs-only wording changes do not change schema or response shape.

## Commands

- Local API available: `npm run gen:api-types`
- Preview contract flow: `npm run gen:api-types:preview`
