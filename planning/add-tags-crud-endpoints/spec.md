# Spec: Add Tags CRUD Endpoints

## Objective

Add first-class tags endpoints for listing, detail lookup (UUID/slug), create, update, and delete with safe default delete behavior.

## Scope

- In scope: New `/tags` route module contracts + handlers, OpenAPI registry sync, integration tests for CRUD and protected delete behavior.
- Out of scope: Bulk tag operations, tag merge tooling, soft-delete (hard delete with cascade), migration/schema changes.

## Architecture Decisions

- Follow contract-first routing: define all tags schemas/`RouteConfig` in `src/routes/tags/index.ts` before handlers.
- Keep delete behavior safe by default: refuse delete when tag is still referenced by posts/tokens and return `409` with usage counts.
- Allow explicit forced delete via query flag (`force=true`) to perform intentional cascade-detach behavior.
- Add new `tags.manage` permission to RBAC for write operations on tags.
- Create reusable `slugify()` utility in `$lib/utils` for string→slug normalization (lowercase, trim, spaces→hyphens).
- Use `id` as path param (consistent with posts/tokens), resolving UUID first then slug in handler.

## Contracts

### Input

- `GET /tags`
  - Query: `search?`, `slugs?`, `limit`, `page`
- `GET /tags/{id}`
  - Path: `id` accepts UUID or slug
- `POST /tags`
  - Body: `name`, `slug`, `description?`
- `PATCH /tags/{id}`
  - Path: `id` accepts UUID or slug
  - Body: partial update of `name`, `slug`, `description`
- `DELETE /tags/{id}`
  - Path: `id` accepts UUID or slug
  - Query: `force?` boolean (default `false`)

### Output

- `GET /tags` returns paginated tags list.
- `GET /tags/{id}` returns a single tag.
- `POST /tags` returns created tag (`201`).
- `PATCH /tags/{id}` returns updated tag (`200`).
- `DELETE /tags/{id}`:
  - `200` when deleted
  - `409` when tag is in use and `force` is not set; payload includes `usage.posts` and `usage.tokens`

### Validation Rules

- `name` and `slug` are required on create and must be trimmed, non-empty, and bounded by DB constraints.
- `PATCH` accepts only allowlisted fields (`name`, `slug`, `description`); no mass assignment.
- Detail/delete identifier resolution uses UUID when valid, otherwise slug lookup.
- `force` is parsed as boolean with default `false`.

## Behavior Rules

- Auth semantics:
  - Read routes: API key protected only (consistent with existing list/detail content routes)
  - Write routes: require authenticated user with `tags.manage` permission (new RBAC permission)
- Duplicate `name` or `slug` on create/update returns `409` with safe conflict message.
- Delete flow:
  1. Resolve tag by UUID/slug
  2. Count current references in `post_tags` and `token_tags`
  3. If references exist and `force=false`, return `409` with usage payload
  4. If `force=true` or no references, delete tag row; DB cascades relation rows

## Edge Cases

- Tag not found by UUID/slug (`404`).
- Slug update conflicts with existing tag slug (`409`).
- Empty patch body or no valid fields (`400`).
- `DELETE` called repeatedly for same tag (`404` after first successful delete).

## Risks and Mitigations

- Risk: Accidental deletion of heavily used tag.
  Mitigation: protected delete default + explicit `force` requirement + usage counts in conflict response.
- Risk: Silent contract drift between OpenAPI and runtime.
  Mitigation: define and register all routes in `index.ts` first, then implement handlers and tests.
- Risk: Unauthorized taxonomy writes.
  Mitigation: route-level permission guard for create/update/delete.

## Acceptance Criteria

- [ ] `/tags` list endpoint exists with filtering/search/pagination and OpenAPI documentation.
- [ ] `/tags/{id}` detail supports UUID and slug lookup.
- [ ] Create and update endpoints validate inputs and reject duplicate `name`/`slug` with `409`.
- [ ] Delete defaults to protected mode (`409` + usage counts when referenced).
- [ ] Force delete (`force=true`) removes tag and relation rows while preserving posts/tokens.
- [ ] Integration tests cover success and negative paths (auth, validation, conflict, protected delete).

## Verification

- `npm run check`
- `npm run lint`
- `npm test`
