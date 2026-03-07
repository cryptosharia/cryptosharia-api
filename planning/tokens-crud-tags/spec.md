# Spec: tokens-crud-tags

## Objective

Complete Tokens API write endpoints by adding create, update, and delete operations with contract-first schemas, strict permission checks, and tag relation writes where `tags` accepts either tag UUIDs or tag slugs.

## Scope

- In scope: `POST /tokens`, `PATCH /tokens/{id}`, and `DELETE /tokens/{id}` contracts, handlers, and integration tests.
- In scope: token-tag relation management via request body `tags` (identifier can be UUID or slug).
- In scope: OpenAPI contract and generated API types sync after contract updates.
- Out of scope: token quotes endpoint behavior, tag CRUD redesign, bulk writes, and DB schema changes.

## Architecture Decisions

- Keep contract-first workflow: update `src/routes/tokens/index.ts` before handler logic.
- Keep route flow explicit: auth gate -> parse/validate -> orchestration -> response.
- Keep auth semantics strict: `401` unauthenticated, `403` authenticated without `tokens.manage`.
- Keep write safety strict: no payload spreading into DB writes; explicitly whitelist writable fields.
- Keep tags deterministic: only existing tags can be attached; unknown identifiers return `400`.
- Keep update tags semantics explicit: if `tags` is provided on PATCH, replace existing token-tag relations.

## Contracts

### Endpoints

- `POST /tokens` (requires `tokens.manage`)
- `PATCH /tokens/{id}` (requires `tokens.manage`)
- `DELETE /tokens/{id}` (requires `tokens.manage`)

### Input

- `POST /tokens` body fields:
  - required: `name`, `slug`, `ticker`, `rank`, `excerpt`, `content`, `shariaStatus`, `logoId`, `website`
  - optional: `status`, `tradingviewSymbol`, `tags`
- `PATCH /tokens/{id}` body fields: partial subset of the same writable fields.
- `tags` field type: `string[]` where each value can be tag UUID or slug.
- `website`: valid URL (accept any valid scheme via URL parser).

### Output

- `POST /tokens`: `201` with payload matching token detail response schema.
- `PATCH /tokens/{id}`: `200` with payload matching token detail response schema.
- `DELETE /tokens/{id}`: `200` with success message payload.

### Validation Rules

- Invalid body returns `400`.
- Duplicate `slug` or `ticker` returns `409`.
- Unknown `logoId` returns `400`.
- Unknown tag identifiers in `tags` return `400` (message includes missing identifiers).
- Empty PATCH body returns `400`.

## Behavior Rules

- Write endpoints require `tokens.manage` permission.
- PATCH/DELETE path `{id}` accepts token UUID or slug.
- `tags` behavior:
  - POST: omitted means create token without tags.
  - PATCH: omitted means keep existing tags unchanged.
  - PATCH with `tags: []` means clear all token tags.
- Publish timestamp behavior:
  - create/update with `status=published` sets `publishedAt` when missing.
  - update to non-published (`draft`/`archived`) clears `publishedAt`.

## Risks and Mitigations

- Risk: OpenAPI/runtime drift.
  - Mitigation: update `RouteConfig` first, then handlers/tests, then regenerate API types.
- Risk: accidental mass assignment.
  - Mitigation: explicit field mapping in inserts/updates.
- Risk: permission regression.
  - Mitigation: integration coverage for both unauthenticated (`401`) and forbidden (`403`) paths.

## Acceptance Criteria

- `POST /tokens`, `PATCH /tokens/{id}`, and `DELETE /tokens/{id}` are implemented and documented.
- `tags` accepts UUID/slug identifiers and updates token-tag relations correctly.
- Unknown tags and unknown `logoId` are rejected with `400`.
- Duplicate `slug` and `ticker` are rejected with `409`.
- Permission semantics are correct (`401` vs `403`).
- OpenAPI and generated API types are synchronized.
- Integration tests cover success and negative write paths.

## Verification

- `npm run gen:api-types` (or document blocker)
- `npm run check`
- `npm run lint`
- `npm test`
