# Spec: posts-crud-tags

## Objective

Complete the Posts API with write endpoints for create, update, and delete, including tag assignment where `tags` accepts either tag UUIDs or tag slugs.

## Scope

- In scope: `POST /posts`, `PATCH /posts/{id}`, and `DELETE /posts/{id}` contracts, handlers, and integration tests.
- In scope: write-time tag relation management through the `tags` request field.
- In scope: OpenAPI and generated API type synchronization for changed contracts.
- Out of scope: new tag creation flows, tag CRUD redesign, bulk post operations, and soft-delete behavior.

## Architecture Decisions

- Keep contract-first flow: update `src/routes/posts/index.ts` before handler logic.
- Keep auth semantics strict via permission gate: unauthenticated request returns `401`, authenticated without `posts.manage` returns `403`.
- Keep write safety strict: no mass assignment from raw payloads; whitelist allowed fields.
- Keep tag write model deterministic: `tags` is optional, accepts UUID or slug values, and only links existing tags.
- For update: when `tags` is provided, replace all existing post-tag relations for that post.

## Contracts

### Endpoints

- `POST /posts` (requires `posts.manage`)
- `PATCH /posts/{id}` (requires `posts.manage`)
- `DELETE /posts/{id}` (requires `posts.manage`)

### Input

- `POST /posts` body fields:
  - `title`, `slug`, `excerpt`, `content`, `coverImageId`, `section`, `type`
  - optional: `status`, `isFeatured`, `eventDate`, `externalLink`, `tags`
- `PATCH /posts/{id}` body fields: partial subset of the same writable fields.
- `tags` field type: `string[]` where each string is either tag UUID or tag slug.

### Output

- `POST /posts`: `201` with created post payload matching detail response schema.
- `PATCH /posts/{id}`: `200` with updated post payload matching detail response schema.
- `DELETE /posts/{id}`: `200` with success message payload.

### Validation Rules

- Reject invalid request body with `400`.
- Reject duplicate post slug with `409`.
- Reject unknown `coverImageId` with `400`.
- Reject unknown tag identifiers in `tags` with `400` and include missing identifiers in message.
- Reject empty PATCH body with `400`.

## Behavior Rules

- Writes require `posts.manage` permission.
- Route id parameter for PATCH/DELETE accepts post UUID or post slug.
- `tags` omitted:
  - POST: create post without tags.
  - PATCH: keep existing tags unchanged.
- `tags` provided:
  - POST: attach provided tags.
  - PATCH: replace existing tags with provided set.
- Publish timestamp behavior:
  - On create/update with `status=published`, set `publishedAt` when missing.
  - On update to `draft` or `archived`, clear `publishedAt`.

## Edge Cases

- Empty `tags: []` on PATCH clears all post-tag relations.
- Duplicate identifiers in `tags` resolve to unique tag relations only.
- Mixed identifier kinds (`uuid` + `slug`) in `tags` are allowed in one request.

## Risks and Mitigations

- Risk: contract/runtime drift across OpenAPI and handlers.
  Mitigation: update `RouteConfig` first, then handlers and tests, then regenerate API types.
- Risk: accidental mass assignment in updates.
  Mitigation: map only explicit writable fields into DB writes.
- Risk: permission drift (`401` vs `403`).
  Mitigation: enforce `requirePermission` in all write handlers and test both cases.

## Acceptance Criteria

- `POST /posts`, `PATCH /posts/{id}`, `DELETE /posts/{id}` exist and follow the defined contracts.
- `tags` in write payload accepts tag UUID or slug identifiers.
- Unknown tag identifiers are rejected with `400`.
- Permission semantics are correct (`401` unauthenticated, `403` forbidden).
- OpenAPI contract and generated API types are updated for new operations.
- Integration tests cover success and negative paths for writes.

## Verification

- `npm run gen:api-types` (or document blocker and run alternative)
- `npm run check`
- `npm run lint`
- `npm test`
