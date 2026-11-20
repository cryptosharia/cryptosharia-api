# VPS migration runbook — staging first

This is preparation, not an authorization to deploy. The image and Compose configuration have not been tested with Docker here. Keep the existing production stack and data intact until a rehearsed cutover is approved. The VPS still depends on Vercel Blob, which remains a separate cutover blocker.

## Audit and open dependencies

- `SERVERLESS=false` selects node-postgres and TCP Redis; the Neon and Upstash packages remain for serverless operation. OTPs, password resets, sessions and market cache use Redis. Existing ephemeral tokens and sessions will not automatically transfer to a new Redis; plan for session invalidation and user impact.
- Production VPS rate limiting uses the configured TCP Redis connection and fails closed if Redis is unavailable. Serverless production retains Upstash REST and requires `KV_REST_API_URL` and `KV_REST_API_TOKEN`. The Redis limiter uses a rolling 100-request, 60-second window per caller; rehearse it against the deployed Redis before cutover. Review client IP handling behind NPM; do not blindly trust forwarded headers. `/health` is public liveness, not a database or Redis readiness test.
- Blob storage uses Vercel for upload, deletion and URLs. The asset provider enum and repository assume `vercel_blob`, and persisted URLs may be referenced elsewhere. A safe S3/MinIO transition needs an inventory, provider-aware reads and deletes, schema migration, access policy, URL compatibility, copy verification, and rollback before changing writes. No objects were copied or deleted here. ImgBB is another image provider.
- API guard reads `API_KEY` and expects an `api-key` header. Coordinate the exact same secret with the BFF's `CS_API_KEY` if that is its configured name; the BFF is outside this repository and its configuration was not verified. Rotate only with a coordinated rollout.
- Resend, sender domain verification, DNS, CMC, ImgBB, password-reset origins and frontend integrations require owner verification. No Firebase integration was found in this repository; any external Firebase identity data or transfer remains unverified and blocked pending an inventory and tested plan. Do not assume credentials or users have migrated.
- Drizzle migrations are in `drizzle/` through `0008`; the app does not migrate on startup. `db:migrate` uses Drizzle's migration journal. An existing restored database must carry its migration metadata; reconcile its actual schema and journal before running migrations. Never use `db:push`, reset, or automatic initialization against imported data. A migration can change data/schema; inspect SQL and rehearse against a restored copy.

## Host and configuration

1. Prepare Ubuntu, Docker Engine and Compose plugin, firewall, TLS termination in Nginx Proxy Manager (NPM), and an external Docker network named `cryptosharia_proxy`. Restrict SSH/Portainer access and maintain OS, image and security updates. Ensure disk capacity for data, WAL, images and off-host backups. Compose limits are initial ceilings for 2 CPU/8 GB, not performance guarantees; measure and tune.
2. Create a private `.env.vps` from `.env.vps.example` with mode 600 and inject real values only on the host through the approved secret process. Never commit or paste them in logs. Set `VPS_ENV_FILE=.env.vps`. Use strong independently generated URL-safe passwords; URLs must match the Postgres user/password/database and Redis password and use service names `postgres` and `redis`. URL-encode special characters if used. Existing Postgres volume credentials are initialized only on first creation; changing env values does not rotate them. Redis password changes must be coordinated with its clients. The Compose env file is visible to privileged Docker users and container inspection; restrict host and Docker access. Do not use example placeholders.
3. Run `VPS_ENV_FILE=.env.vps scripts/vps/preflight.sh` from this directory. It checks Compose parsing and external network existence, not secret strength, URL consistency, schema, image availability or service connectivity. Do not print `docker compose config` with secrets. Compose exposes no database or Redis host ports; API joins proxy and internal networks. Configure NPM to reach `api:3000` only over the proxy network; restrict other members of that shared network. Ensure upstream TLS and trusted proxy/IP behavior are tested.
4. Use `docker compose --env-file .env.vps -f compose.vps.yml up -d postgres redis` after explicitly confirming the intended project and volumes. PostgreSQL 18 uses `/var/lib/postgresql` as its volume root. Never run `down -v` on data volumes. Healthchecks establish service availability, not correctness or backup recoverability. Redis uses AOF, but is not a substitute for a backup strategy.

## Backup, migration and cutover

1. Establish an encrypted, access-controlled, off-host backup schedule and retention, plus an independently tested restore procedure. `VPS_ENV_FILE=.env.vps scripts/vps/backup.sh /secure/path/backup.dump` writes a PostgreSQL custom-format dump without overwriting a file. It captures one consistent database snapshot, not roles, cluster globals, Redis, or blobs. Protect the dump and encryption keys. `scripts/vps/verify-restore.sh /secure/path/backup.dump` restores into a temporary network-isolated PostgreSQL 18 container and removes it afterward. This checks restore execution, not business completeness; validate counts, constraints and representative records separately. Only use trusted dumps: restores can execute SQL. These scripts have not been run against a real database here.
2. In a separate staging environment, inventory source PostgreSQL version, extensions, ownership, journal and schema; test a compatible logical export/import and compare counts, representative records and checksums as appropriate. Coordinate source credentials through the owner; none were accessed here. A dump alone does not include changes made after its snapshot. Rehearse a maintenance/write freeze, final consistent export and import into a fresh, explicitly identified target. Preserve the original and do not overwrite a target containing valuable data. Check Postgres version compatibility and privileges. Verify a restore before proceeding.
3. Review pending SQL and migration journal on the imported staging copy. After a verified backup, run `docker compose --env-file .env.vps -f compose.vps.yml --profile tools run --rm migrate` once as an explicit operator action. Do not run simultaneous migration jobs or start application writes during migration. Stop on errors; investigate and restore to a separately identified clean target rather than rerunning blindly. The migration image contains development tooling and is not the API runtime image.
4. Start the API with `docker compose --env-file .env.vps -f compose.vps.yml up -d api`. Check container logs without exposing secrets and perform the staging checklist below. Build and pin vetted image digests for production after testing; tags can change. Confirm static files and healthcheck in the actual built image. Size the connection pool, host resources and backups under realistic load.
5. Rehearse rollback before cutover. At the approved cutover freeze writes to the old system, take and verify final backup, import and reconcile the target, migrate if needed, validate, then coordinate proxy/DNS and BFF configuration with owners. Record the precise cutover point and monitor errors. No DNS, provider settings or production data were changed by this work.

## Staging smoke checklist

- [ ] Images build on the VPS architecture; non-root API starts with read-only root and static `robots.txt` and `.well-known` files are served.
- [ ] PostgreSQL and authenticated Redis become healthy; inaccessible without credentials and without published host ports. Confirm persistence after a controlled restart.
- [ ] `/health` responds; verify actual DB-backed reads and Redis-backed auth separately. Stop one dependency in staging and observe failures and recovery.
- [ ] Valid and invalid BFF API keys behave as expected; check rate-limit headers, shared limits, provider outage behavior and real client IP handling through NPM.
- [ ] Login, OTP, reset email, sessions and logout work with staging accounts; confirm expected behavior of sessions created before cutover.
- [ ] Upload, read and delete a **new staging-only** Blob and image; verify old asset URLs and metadata. Never delete production assets during tests.
- [ ] Resend delivery and reset links, CMC and ImgBB integrations work with staging credentials; confirm TLS, hostnames, CORS and frontend flows.
- [ ] Backup and isolated restore succeed; compare schema, journal, counts and representative records; practice recovery and record timings.
- [ ] Run realistic load and resource monitoring, log rotation, disk alerts and failure recovery tests.

## Rollback

Keep the old services and immutable backup available. If validation fails before writes reach the VPS, route back to the old stack after coordinating owners. Once writes occur on the VPS, routing back alone loses those writes: freeze writes and reconcile or reverse-migrate them with a separately rehearsed plan before switching. Schema changes may be irreversible and require a verified restore. Preserve both datasets and audit the reconciliation; do not delete volumes or old Blob objects as part of rollback.

### Local media storage

Set `STORAGE_PROVIDER=local`, `STORAGE_LOCAL_ROOT=/data/media`, and
`STORAGE_PUBLIC_BASE_URL=https://media.example.invalid` in the VPS environment.
The persistent `media_data` volume is writable by the API and mounted read-only
by the internal `media` nginx service. In Nginx Proxy Manager, add custom
locations `/assets/` and `/temp/assets/` forwarding to `media` on port 80,
preserving the request path. The public base URL must map those paths to this
service. If an existing public origin already uses either path, use a separate
media origin or coordinate routing to avoid conflicts. The volume trusts the API
as its writer; it does not protect against a fully compromised API process.
The enum migration is operator-run; do not start local uploads until it is applied.
Existing Blob records and objects remain on Blob and require a separate migration.

## Local storage cleanup safety

The existing asset-cleanup selection remains restricted to legacy `vercel_blob` assets. Automatic cleanup of new local assets is intentionally disabled until all potential references (including Academy and website settings) are audited. Never run legacy cleanup against production during the data cutover.
