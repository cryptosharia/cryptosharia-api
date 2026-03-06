# Spec: Add Assets Upload Endpoint

## Objective

Add a new authenticated `POST /assets` endpoint that uploads files to Vercel Blob and persists upload metadata into the `assets` table.

## Scope

- In scope: New `/assets` route contract + handler, Vercel Blob upload orchestration, DB persistence, OpenAPI registration, integration tests.
- Out of scope: Asset deletion endpoint, signed upload URLs, image transformation pipeline, migration changes to the `assets` table schema.

## Architecture Decisions

- Keep contract-first route module pattern: define route contract/schemas in `src/routes/assets/index.ts` before handler logic.
- Use server-side Vercel Blob upload from route handler (trusted backend flow) so storage token stays private.
- Restrict upload access to existing content managers (`posts.manage` or `tokens.manage`) to stay consistent with current media upload policy.
- Persist only explicit allowlisted metadata fields into `assets` table (`pathname`, `filename`, `size`, `mimeType`, `provider`, `createdBy`; include `width/height` only when available and safe).

## Contracts

### Input

- Method/path: `POST /assets`
- Content type: `multipart/form-data`
- Required part: `file` (binary)

### Output

- Success (`201`): persisted asset metadata from `assets` table, mapped through schema parse.
- Error (`400`): invalid multipart payload, missing file, invalid file size/type.
- Error (`401`): unauthenticated API key (hook-level behavior).
- Error (`403`): authenticated but missing required permission.
- Error (`502`): upstream storage provider upload failure.
- Error (`500`): internal failure while processing/persisting upload.

### Validation Rules

- `file` must exist and be a `File`.
- `file.size` must be greater than 0 and under endpoint max size limit.
- Filename is derived from uploaded file metadata (`file.name`) and must be non-empty after normalization.
- Only explicit DB columns are written (no direct spread of untrusted payload).

## Behavior Rules

- Route checks permission first, then parses multipart form data.
- Handler uploads file bytes to Vercel Blob and receives canonical blob URL/path.
- Handler inserts one `assets` row with provider=`vercel_blob` and upload metadata.
- Response body returns sanitized/persisted row via Zod schema.
- Activity is logged with subject type `asset` (or equivalent existing convention).

## Edge Cases

- Multipart payload provided but no `file` part.
- Client sends non-file field for `file` key.
- Upload provider returns non-2xx response or throws.
- DB insert fails after successful blob upload (document residual orphan risk and error behavior).

## Risks and Mitigations

- Risk: Large or malformed uploads can cause resource abuse.
  Mitigation: Enforce strict size/type validation and fail fast before expensive operations.
- Risk: Orphaned blobs if DB insert fails after upload.
  Mitigation: Return safe error and document follow-up cleanup path; keep insert mapping deterministic for later cleanup tooling.
- Risk: Sensitive token leakage in logs/errors.
  Mitigation: Never log blob tokens/raw provider responses containing secrets.

## Acceptance Criteria

- [ ] `POST /assets` exists and is registered in OpenAPI route registry.
- [ ] Upload succeeds for valid multipart file and creates one `assets` row with `provider=vercel_blob`.
- [ ] Invalid/missing file payload returns `400` with consistent API error shape.
- [ ] Permission gate returns `403` for authenticated users without upload permission.
- [ ] OpenAPI docs reflect runtime request/response behavior.
- [ ] Integration tests cover success and at least one negative path.

## Verification

- `npm run check`
- `npm run lint`
- `npm test`
