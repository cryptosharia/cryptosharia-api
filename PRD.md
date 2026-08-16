# CryptoSharia API v1.1.0 - Project Requirements Document

## 1. Executive Summary

CryptoSharia API v1.1.0 adalah perbaikan fondasi backend CryptoSharia agar siap digunakan di production dengan struktur yang lebih stabil, konsisten, terdokumentasi, dan mudah dikembangkan.

Fokus project ini bukan menambah fitur produk besar baru, melainkan membangun ulang backend API berdasarkan requirements fitur yang sudah ada dengan standar arsitektur baru. API harus mempertahankan behavior domain yang sudah berjalan, sambil menyelaraskan contract response, dokumentasi OpenAPI, testing, rate limiting, storage, dan deployment agar siap untuk penggunaan production.

Keberhasilan project diukur dari tersedianya seluruh endpoint v1.1.0, konsistensi API contract, dokumentasi OpenAPI yang lengkap, test coverage untuk behavior penting, rate limiting production-grade, dan deployment production menggunakan platform yang sudah ditentukan.

## 2. Goals

- Menyediakan backend API CryptoSharia yang siap digunakan di production.
- Mempertahankan behavior utama untuk authentication, users, posts, tokens, tags, messages, assets, dan API documentation.
- Menyelaraskan response body dan dokumentasi OpenAPI ke standar baru project.
- Menyediakan rate limiting production berbasis Redis yang aman untuk serverless dan multi-instance deployment.
- Menyediakan automated tests untuk menjaga behavior penting tidak rusak saat pengembangan berikutnya.
- Menyiapkan runtime production menggunakan Vercel, Neon, Upstash Redis, dan Vercel Blob.
- Tetap menyediakan Docker-based environment untuk development, testing, dan production-like runtime validation.

## 3. Non-Goals

- Tidak membangun fitur Academy.
- Tidak menambahkan Google OAuth.
- Tidak mendesain ulang business logic utama di luar kebutuhan penyesuaian API contract dan standar project baru.

## 4. Product Scope

CryptoSharia API v1.1.0 mencakup module berikut:

- Authentication dan session management.
- User management.
- Posts/content management.
- Crypto token screening/content management.
- Tags dan relasi tag dengan posts/tokens.
- Contact messages.
- Asset upload dan asset metadata.
- API documentation melalui OpenAPI JSON, OpenAPI YAML, dan Scalar docs.
- Cross-cutting API security, authorization, rate limiting, response contract, pagination, validation, dan testing.

### 4.1 Module Architecture

Project menggunakan pemisahan antara feature modules, infrastructure/provider
modules, dan cross-cutting modules. Feature modules tidak boleh mengakses
external provider secara langsung; dependency provider harus melalui
contract/module yang sesuai.

#### Feature Modules

- `UsersModule` — user identity dan operasi data user.
- `AuthModule` — signup, verification, signin, password reset, access token,
  refresh token, signout, dan current user flow.
- `PostsModule` — post/content dan relasi post-tag.
- `TokensModule` — crypto token, screening data, quote flow, dan relasi token-tag.
- `TagsModule` — shared tags dan pemeriksaan penggunaan tag.
- `MessagesModule` — contact messages.
- `AssetsModule` — asset metadata, upload orchestration, dan cleanup references.

#### Infrastructure and Provider Modules

- `DrizzleModule` — PostgreSQL connection, schema, dan database service.
- Drizzle queries menggunakan query builder biasa; Drizzle relation API tidak
  diperlukan.
- `CryptoModule` — password hashing, token generation/hashing, dan JWT
  primitives.
- `MailerModule` — email delivery contract dan adapter Resend.
- `StorageModule` — object upload/delete contract dan adapter Vercel Blob.
- `ImageProviderModule` — image upload contract dan adapter ImgBB.
- `MarketDataModule` — market data contract dan adapter CoinMarketCap untuk
  quote/market data.
- `RateLimitModule` — production-only rate limiting menggunakan Upstash Redis.
  Rate limiting disabled sepenuhnya pada development/testing; generic Redis
  client tidak diekspos ke feature modules dan refresh token tetap di PostgreSQL.
- `ActivityLogsModule` — audit log internal yang dipakai lintas feature module.

#### Cross-Cutting Modules

- `SecurityModule` — API key boundary, bearer authentication, permission
  metadata/guard, ownership helpers, client IP resolution, dan bearer token
  verification melalui contract dari `CryptoModule`.
- `OpenApiModule` — OpenAPI JSON/YAML dan Scalar documentation.
- `SystemModule` — health/system endpoints dan static metadata.

#### Dependency Direction

```text
AuthModule -> UsersModule
AuthModule -> CryptoModule
AuthModule -> MailerModule
AuthModule -> ActivityLogsModule

ActivityLogsModule -> DrizzleModule
RateLimitModule -> Upstash Redis adapter (production only)

SecurityModule -> CryptoModule
SecurityModule -> RateLimitModule

AssetsModule -> StorageModule
AssetsModule -> ImageProviderModule
AssetsModule -> DrizzleModule

PostsModule -> AssetsModule
PostsModule -> TagsModule
PostsModule -> ActivityLogsModule
TokensModule -> AssetsModule
TokensModule -> TagsModule
TokensModule -> MarketDataModule
TokensModule -> ActivityLogsModule

Feature modules -> SecurityModule
Feature modules -> DrizzleModule
Application modules -> infrastructure/provider modules
Infrastructure/provider modules -X-> feature modules

ActivityLogsModule -X-> AuthModule
SecurityModule -X-> feature modules
```

Provider modules must expose application-level contracts so feature modules and
Auth do not depend directly on Resend, Vercel Blob, ImgBB, or provider-specific
SDK types. Production adapters use the configured providers; test adapters use
mock, in-memory, or no-op implementations and never perform real external
network calls.

#### Persistence Ownership

- `users` belongs to `UsersModule`.
- `auth_tokens` and `refresh_tokens` are Auth persistence owned by `AuthModule`.
- `activity_logs` is internal persistence owned by `ActivityLogsModule`.
- `assets` and `imgbb_images` are asset/provider persistence owned by
  `AssetsModule`.
- `posts` belongs to `PostsModule`.
- `tokens` belongs to `TokensModule`.
- `tags`, `post_tags`, and `token_tags` belong to `TagsModule`.
- `messages` belongs to `MessagesModule`.

Database tetap menjadi shared infrastructure dan foreign key dapat merujuk user
dari fitur lain, tetapi feature business logic harus melalui service contract
module yang memiliki data tersebut.

`OpenApiModule` boleh mengimpor route config dari feature modules untuk
registrasi dokumentasi. Import tersebut hanya untuk dokumentasi dan tidak boleh
menjadi dependency business logic.

### 4.2 Recommended Implementation Order

1. `DrizzleModule`, `OpenApiModule`, `SystemModule`, `SecurityModule`, dan
   `RateLimitModule` (production runtime only)
2. `UsersModule`
3. `CryptoModule`
4. `MailerModule`
5. `ActivityLogsModule`
6. `MarketDataModule`
7. `AuthModule`
8. `StorageModule`
9. `ImageProviderModule`
10. `AssetsModule`
11. `TagsModule`
12. `PostsModule`
13. `TokensModule`
14. `MessagesModule`

Cross-cutting modules seperti Security, OpenAPI, Drizzle, dan System adalah
fondasi aplikasi. Permission enforcement di SecurityModule dikembangkan
bersamaan dengan feature modules yang menggunakannya.

## 5. Consumers

API ini digunakan oleh:

- Website atau frontend CryptoSharia yang membutuhkan data posts, tokens, tags, dan public content.
- Admin/internal tools yang mengelola users, posts, tokens, tags, messages, dan assets.
- Accounts/auth flow yang membutuhkan signup, signin, verification, refresh token, signout, password reset, dan current-user session data.
- Internal operational process yang membutuhkan maintenance asset cleanup melalui script/command internal.

## 6. Global API Requirements

### 6.1 Access Boundary

- Public endpoint hanya endpoint yang secara eksplisit didefinisikan public.
- Public endpoints meliputi `/`, `/health`, `/openapi.json`, dan
  `/openapi.yaml`.
- Protected endpoint wajib menerima `Api-Key` valid.
- Authenticated endpoint wajib menerima `Api-Key` valid dan `Authorization: Bearer <accessToken>` valid.
- Endpoint yang membutuhkan role/permission wajib menolak user yang tidak memiliki permission yang sesuai.
- Missing/invalid API key menghasilkan `401 Unauthorized`.
- Missing/invalid/expired bearer token pada authenticated endpoint menghasilkan `401 Unauthorized`.
- Authenticated user yang tidak memiliki permission menghasilkan `403 Forbidden`.

Access classification:

- Public: `/`, `/health`, `/openapi.json`, dan `/openapi.yaml`.
- API-key-only: signup, email verification, signin, refresh, password forgot,
  password reset, public content reads, dan public message creation. Content
  reads dan quote access tetap membutuhkan `Api-Key`, tetapi bearer token
  bersifat opsional.
- API-key plus bearer authentication: current user, user management, content
  management writes, tag management, message management, dan asset upload.
- Maintenance operations tidak menjadi endpoint HTTP publik dan dijalankan
  melalui command/script internal.

- API-key validation menggunakan satu configured application API key.

### 6.2 Success Response

- Response sukses mengembalikan payload langsung sebagai object, array, atau empty response sesuai kebutuhan endpoint.
- Response sukses tidak menggunakan wrapper `success`, `message`, `errors`, atau `data`.
- Field sensitif seperti password hash, token hash, refresh token record metadata internal, dan secret provider tidak boleh keluar di response.

### 6.3 Error Response

- Response error mengikuti format standar project baru:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message"
}
```

- Validation error, authentication error, authorization error, not-found error, conflict error, rate-limit error, dan provider failure error harus terdokumentasi di OpenAPI.
- Domain error code harus eksplisit dan konsisten dengan standar project baru.

### 6.4 Pagination

- Endpoint list yang mendukung pagination menerima `page` dan `limit`.
- `page` minimal `1`.
- `limit` minimal `1` dan maksimal `100`.
- Body response list berupa array item langsung.
- Metadata pagination dikirim melalui lowercase response headers:

```text
total-items: <number>
```

## 7. OpenAPI Documentation Requirements

- API documentation tersedia melalui `/`, `/openapi.json`, dan `/openapi.yaml`.
- OpenAPI document menggunakan standar OpenAPI project baru.
- Semua endpoint wajib terdokumentasi.
- Setiap endpoint wajib memiliki schema eksplisit untuk params, query, request body, success response, dan error response bila berlaku.
- Response documentation wajib mengikuti standar Zod/OpenAPI baru project.
- Semua route config module wajib terdaftar di OpenAPI registry.
- OpenAPI document harus bisa digunakan untuk menghasilkan typed client/schema testing.

## 8. Authentication & Session Requirements

### 8.1 Endpoints

| Method | Endpoint                | Requirement                                                   |
| ------ | ----------------------- | ------------------------------------------------------------- |
| POST   | `/auth/signup`          | Register user account                                         |
| POST   | `/auth/verify`          | Verify email using verification token                         |
| POST   | `/auth/signin`          | Authenticate email/password and issue access + refresh tokens |
| POST   | `/auth/refresh`         | Rotate refresh token and issue a new token pair               |
| POST   | `/auth/signout`         | Revoke refresh token                                          |
| GET    | `/auth/me`              | Return current authenticated user profile                     |
| POST   | `/auth/password/forgot` | Request password reset                                        |
| POST   | `/auth/password/reset`  | Reset password using reset token                              |

### 8.2 Signup & Verification

- Signup membuat user normal dengan role `member`.
- Request signup tidak boleh bisa mengatur role, status, verification state, atau privileged fields lain.
- Nama user disimpan dalam bentuk trimmed.
- Signup menerima `redirectUrl` dengan tepat satu placeholder `{token}` untuk
  link verification email.
- User baru wajib melalui email verification sebelum bisa signin.
- Re-signup menggunakan email yang belum verified memperbarui akun unverified yang sama dan mengganti verification token aktif.
- Re-signup menggunakan email yang sudah verified menghasilkan conflict.
- Verification token disimpan dalam bentuk hash di PostgreSQL.
- Verification token memiliki masa berlaku terbatas.
- Verification token lama yang masih aktif harus revoked saat token baru dibuat.
- Verification yang berhasil menandai email user sebagai verified dan merevoke token.

### 8.3 Signin, Refresh, Signout, Me

- Signin menggunakan email dan password.
- User yang belum verified tidak dapat signin.
- User dengan status non-active tidak dapat signin.
- Password diverifikasi menggunakan hashing strategy yang aman dan compatible dengan data existing.
- Signin yang berhasil mengembalikan access token dan refresh token.
- Refresh token disimpan di PostgreSQL.
- Refresh token rotation wajib dilakukan saat `/auth/refresh` berhasil.
- Refresh token lama harus revoked setelah token baru dibuat.
- Refresh token yang invalid, expired, revoked, atau tidak ditemukan menghasilkan `401`.
- Signout merevoke refresh token dan bersifat idempotent.
- `/auth/me` mengembalikan safe user profile dan role dari bearer token yang valid.

### 8.4 Password Reset

- Forgot password tidak boleh membuka informasi apakah email terdaftar atau tidak.
- Jika user ada, sistem membuat reset token baru, menyimpannya dalam bentuk hash, dan merevoke reset token aktif sebelumnya.
- Forgot password menerima `redirectUrl` dengan tepat satu placeholder `{token}`
  untuk link password reset email.
- Reset token memiliki masa berlaku terbatas.
- Reset password hanya berhasil dengan reset token yang valid, belum expired, dan belum revoked.
- Reset password yang berhasil memperbarui password hash dan merevoke reset token.

### 8.5 Email Notification Behavior

- Production flow mengirim email untuk verification dan password reset sesuai kebutuhan.
- Automated tests tidak boleh bergantung pada pengiriman email asli.
- Test/dev behavior untuk email ditangani melalui mailer adapter mock/no-op;
  public API tidak menyediakan request-level testing flag seperti `notify`.

## 9. Authorization Requirements

### 9.1 Roles

- `super_admin`
- `admin`
- `posts_manager`
- `tokens_manager`
- `member`

### 9.2 Permissions

- `posts.manage`
- `posts.read`
- `tokens.manage`
- `tags.manage`
- `users.read`
- `users.update`
- `users.manage_status`
- `users.manage_role`
- `messages.read`

### 9.3 Role Mapping

| Role             | Permissions                                                          |
| ---------------- | -------------------------------------------------------------------- |
| `super_admin`    | All permissions                                                      |
| `admin`          | All permissions except `users.manage_role` and `users.manage_status` |
| `posts_manager`  | `posts.manage`, `tags.manage`                                        |
| `tokens_manager` | `tokens.manage`, `tags.manage`                                       |
| `member`         | No admin permissions                                                 |

## 10. Users Requirements

| Method | Endpoint             | Requirement                            |
| ------ | -------------------- | -------------------------------------- |
| GET    | `/users`             | List users with pagination and filters |
| GET    | `/users/{id}`        | Get user detail                        |
| PATCH  | `/users/{id}`        | Update user profile                    |
| PUT    | `/users/{id}/status` | Update user status                     |
| PUT    | `/users/{id}/role`   | Update user role                       |

- User list supports pagination, search by name/email, role filter, and status filter.
- User detail can be accessed by the owner or user with `users.read`.
- User profile can be updated by the owner or user with `users.update`.
- Status update requires `users.manage_status`.
- Role update requires `users.manage_role`.
- User response must not expose sensitive auth fields.

## 11. Posts Requirements

| Method | Endpoint      | Requirement                 |
| ------ | ------------- | --------------------------- |
| GET    | `/posts`      | List posts                  |
| POST   | `/posts`      | Create post                 |
| GET    | `/posts/{id}` | Get post by UUID or slug    |
| PATCH  | `/posts/{id}` | Update post by UUID or slug |
| DELETE | `/posts/{id}` | Delete post by UUID or slug |

- Post list supports filters for statuses, sections, types, slugs, exclude, tags, search, page, and limit.
- Requests without a bearer user default to published posts only.
- Requests without a bearer user cannot explicitly request non-public statuses.
- Users with `posts.manage` can access non-public statuses.
- List response excludes full `content`.
- Detail response includes full `content`.
- Cover image returns normalized asset metadata.
- Tag relation uses relational junction table, not array field.
- Create/update/delete require `posts.manage`.
- Duplicate slug returns conflict.

## 12. Tokens Requirements

| Method | Endpoint         | Requirement                                        |
| ------ | ---------------- | -------------------------------------------------- |
| GET    | `/tokens`        | List crypto tokens                                 |
| POST   | `/tokens`        | Create token                                       |
| GET    | `/tokens/{id}`   | Get token by UUID or slug                          |
| PATCH  | `/tokens/{id}`   | Update token by UUID or slug                       |
| DELETE | `/tokens/{id}`   | Delete token by UUID or slug                       |
| GET    | `/tokens/quotes` | Return quote/market data for requested token slugs |

- Token list supports filters for statuses, sharia statuses, slugs, exclude, tags, search, page, and limit.
- Requests without a bearer user default to published/non-restricted statuses only.
- Requests without a bearer user cannot explicitly request restricted/non-public statuses.
- Users with `tokens.manage` can access restricted/non-public statuses.
- List response excludes full `content`.
- Detail response includes full `content`.
- Logo returns normalized asset metadata.
- Tag relation uses relational junction table, not array field.
- Create/update/delete require `tokens.manage`.
- Duplicate slug or ticker returns conflict.
- Quote endpoint returns quote fields for requested token slugs.

## 13. Tags Requirements

| Method | Endpoint     | Requirement                |
| ------ | ------------ | -------------------------- |
| GET    | `/tags`      | List tags                  |
| POST   | `/tags`      | Create tag                 |
| GET    | `/tags/{id}` | Get tag by UUID or slug    |
| PATCH  | `/tags/{id}` | Update tag by UUID or slug |
| DELETE | `/tags/{id}` | Delete tag by UUID or slug |

- Tag list supports search, slug filter, page, and limit.
- Create/update/delete require `tags.manage`.
- Duplicate name or slug returns conflict.
- Delete without force returns conflict when tag is still used by posts or tokens.
- Delete conflict response includes usage counts for posts and tokens.
- Delete supports `force=true`.

## 14. Messages Requirements

| Method | Endpoint         | Requirement            |
| ------ | ---------------- | ---------------------- |
| POST   | `/messages`      | Create contact message |
| GET    | `/messages`      | List messages          |
| GET    | `/messages/{id}` | Get message detail     |

- Message create accepts name, email, and message.
- Invalid email, empty message, invalid length, or invalid payload returns validation error.
- Message list supports search, sender filter, page, and limit.
- Message list/detail requires `messages.read`.

## 15. Assets Requirements

| Method | Endpoint  | Requirement                                               |
| ------ | --------- | --------------------------------------------------------- |
| POST   | `/assets` | Upload asset to Vercel Blob and persist metadata          |
| POST   | `/imgbb`  | Upload image through ImgBB and preserve its metadata flow |

- `/assets` uses Vercel Blob in development and production.
- `/imgbb` uses ImgBB in development and production.
- Upload uses `multipart/form-data` with a file field.
- `/assets` accepts files up to 4MB.
- `/imgbb` accepts image files up to 32MB.
- Upload requires `posts.manage` or `tokens.manage`.
- Successful upload stores asset metadata in PostgreSQL.
- Asset response includes the persisted asset metadata with its `id` for
  reference from posts, tokens, and user avatar fields. It does not return a
  derived public URL.
- Resource write requests accept asset IDs (`avatarId`, `coverImageId`, or
  `logoId`). Resource read responses expose referenced assets as nested objects
  (`avatar`, `coverImage`, or `logo`) containing the asset ID, derived public
  URL, and useful metadata; an unset reference returns `null`.
- Missing file, empty file, invalid payload, or oversized file returns validation error.
- Storage provider failure returns provider failure error.
- Automated E2E tests fully mock both Vercel Blob and ImgBB integrations and must not perform real object storage network calls.
- Unit tests also mock storage provider integrations as needed.

## 16. Maintenance Requirements

- Asset cleanup must be available as an internal maintenance command/script.
- Asset cleanup must avoid deleting assets still referenced by users, posts, tokens, or other persisted records.
- Asset cleanup should not be exposed as a normal public/protected HTTP API endpoint unless there is a clear operational requirement.
- Asset cleanup accepts `dryRun`, `limit`, and `maxAgeDays` options.
- Cleanup only targets old, unreferenced Vercel Blob assets.
- Cleanup reports candidate, deleted, and failed counts together with failure details.
- A missing object in Vercel Blob is treated as already deleted, allowing its
  database metadata to be removed safely.
- Seed/demo routes and other development-only HTTP endpoints are outside the
  v1.1.0 API scope.

## 17. Rate Limiting Requirements

- Rate limiting uses `@upstash/ratelimit` with Upstash Redis in production.
- Rate limiting applies only to the production environment.
- Production rate limiting applies to protected/private endpoints after API key validation.
- API docs endpoints may be excluded from rate limiting.
- Bucket key is based on client IP after trusted proxy/BFF boundary handling.
- Different client IP values must use separate buckets.
- Requests over limit return `429 Too Many Requests`.
- If the Upstash rate-limit provider is unavailable in production, protected
  requests fail closed with `503 Service Unavailable` rather than bypassing the
  rate limit.

## 18. Data Requirements

- PostgreSQL is the source of truth for users, auth tokens, refresh tokens, posts, tokens, tags, messages, assets, activity logs, and relationships.
- Production PostgreSQL provider is Neon.
- Database UUID behavior follows the existing schema behavior: UUID primary keys
  use `defaultRandom()` and are not migrated to `uuidv7()`.
- Access tokens use `ACCESS_TOKEN_SECRET`; refresh tokens are opaque random
  values returned only to the client, stored as SHA-256 hashes, and revoked in
  PostgreSQL, with no separate refresh-token signing secret.
- Existing table names, enum values, column names, foreign keys, and junction relationships must remain representable.
- Tags relationship with posts and tokens remains relational through junction tables.
- Refresh tokens remain persisted in PostgreSQL.
- Email verification and password reset tokens remain persisted in PostgreSQL as hashed opaque tokens.

## 19. Testing & Quality Requirements

- E2E tests cover critical behavior for auth, users, posts, tokens, tags, messages, assets, OpenAPI, authorization, validation, and pagination.
- Unit tests cover important isolated business logic such as token handling, permission checks, password/session behavior, and service-level branching.
- Tests must not depend on real email delivery or real object storage network calls.
- OpenAPI-generated schema/types must stay aligned with implemented route contracts.
- Linting and formatting must pass before the project is considered ready.

## 20. Deployment & Runtime Requirements

- Production API hosting target is Vercel.
- Production database provider is Neon.
- Production Redis/rate limiting provider is Upstash Redis.
- Production object storage provider is Vercel Blob.
- Required environment variables must be validated at startup.
- Docker-based environments remain available for development, testing, and production-like validation.
- Docker templates include PostgreSQL and Redis for non-managed/local runtime scenarios.
