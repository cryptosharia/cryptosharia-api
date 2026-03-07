# Spec: ops-assets-cleanup

## Objective

Add a secure maintenance endpoint at `/ops/assets/cleanup` to remove orphaned Vercel Blob assets that are no longer referenced by posts, tokens, or user avatars.

## Scope

- In scope: new ops route contract + handler, orphan filtering query, blob deletion orchestration, DB row cleanup, and integration tests.
- In scope: manual trigger support and Vercel Cron compatibility.
- In scope: dry-run mode and bounded batch execution to avoid serverless timeout risk.
- In scope: hooks-level auth split for public/private/ops route classes using `CS_API_KEY_OPS`.
- Out of scope: full asset management UI/API (`GET /assets`, `DELETE /assets/{id}`), DB schema migrations, and provider changes outside Vercel Blob.

## Architecture Decisions

- Use a dedicated ops endpoint namespace: `/ops/assets/cleanup`.
- Keep auth tiering explicit in hooks:
  - Public routes: no API key.
  - Private routes: existing `CS_API_KEY_*` behavior.
  - Ops routes (`/ops/*`): require `Api-Key` equal to static `CS_API_KEY_OPS`.
- Keep behavior explicit and safe: authenticate ops trigger -> select orphan candidates -> delete blobs -> delete DB rows -> return summary.
- Restrict cleanup target to `assets.provider = 'vercel_blob'` only.
- Filter only true orphans (not referenced by any of: `posts.coverImageId`, `tokens.logoId`, `users.avatarId`).
- Apply grace period before deletion to avoid deleting recently uploaded but not-yet-linked files.
- Execute in batches (`limit`) with deterministic ordering for repeatable runs.

## Contracts

### Endpoint

- `POST /ops/assets/cleanup`

### Query / Body

- `dryRun` (optional boolean, default `false`): when `true`, do not delete anything; only report candidates.
- `limit` (optional integer, default `100`, max `500`): maximum candidates processed in one run.
- `maxAgeDays` (optional integer, default `7`): minimum asset age before eligible cleanup.

### Auth

- Ops auth must be enforced in `hooks.server.ts`:
  - Requests to `/ops/*` require `Api-Key` exactly equal to static env `CS_API_KEY_OPS`.
  - `CS_API_KEY_OPS` may also call normal private endpoints (same header semantics as other API keys).
  - Non-ops API keys must not access `/ops/*`.
- Missing/invalid key returns `401`.

### Output

- Success (`200`): summary payload:
  - `dryRun`, `limit`, `maxAgeDays`
  - `candidates`, `deleted`, `failed`
  - `failures` (bounded list with asset id/pathname and safe reason)
- Error (`400`): invalid query/body values.
- Error (`401`): invalid or missing ops secret.
- Error (`500`): unexpected internal failure.

## Filtering Rules

An asset is eligible when all are true:

1. `assets.provider = 'vercel_blob'`
2. `assets.createdAt <= now() - maxAgeDays`
3. Not referenced by:
   - `posts.coverImageId`
   - `tokens.logoId`
   - `users.avatarId`

## Behavior Rules

- Dry run returns candidate counts only; no blob or DB deletion.
- Real run deletes each blob by `assets.pathname` using Vercel Blob SDK.
- After successful blob deletion, delete the corresponding `assets` DB row.
- If blob is already missing upstream, treat as cleanup-success and remove DB row.
- Record per-item failures and continue (best-effort batch), do not abort whole run on one item.
- Response must not leak secrets or raw upstream provider internals.

## Risks and Mitigations

- Risk: accidental deletion of in-use assets.
  - Mitigation: strict orphan filter against posts/tokens/users references + grace period.
- Risk: function timeout on large cleanup runs.
  - Mitigation: enforce `limit` max and recommend frequent cron runs.
- Risk: unauthorized triggering.
  - Mitigation: dedicated ops secret guard and no public documentation for this route.

## Acceptance Criteria

- [ ] `/ops/assets/cleanup` exists and requires ops secret.
- [ ] Hooks enforce route tiers (`public`, `private`, `ops`) and `/ops/*` requires `CS_API_KEY_OPS`.
- [ ] Dry-run mode reports candidates without deleting blobs/rows.
- [ ] Real mode deletes only orphaned `vercel_blob` assets.
- [ ] Referenced assets are never selected/deleted.
- [ ] Missing upstream blob still results in DB cleanup for that orphan row.
- [ ] OpenAPI contract and generated API types stay in sync.
- [ ] Integration tests cover auth failure, dry-run, and successful cleanup.
- [ ] Hooks tests cover `/ops/*` key behavior (ops key allowed, non-ops key denied).

## Verification

- `npm run gen:api-types`
- `npm run check`
- `npm run lint`
- `npm test`
