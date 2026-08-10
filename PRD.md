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
- Tidak menambahkan OTP login atau OTP verification flow.
- Tidak membuat frontend/dashboard baru.
- Tidak mendesain ulang business logic utama di luar kebutuhan penyesuaian API contract dan standar project baru.
- Tidak mengubah role dan permission model kecuali diperlukan untuk menjaga compatibility behavior.
- Tidak memindahkan refresh token atau auth token ke Redis; keduanya tetap disimpan di PostgreSQL.
- Tidak menjadikan maintenance operation sebagai public API endpoint bila bisa dijalankan sebagai internal command/script.

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

## 5. Consumers

API ini digunakan oleh:

- Website atau frontend CryptoSharia yang membutuhkan data posts, tokens, tags, dan public content.
- Admin/internal tools yang mengelola users, posts, tokens, tags, messages, dan assets.
- Accounts/auth flow yang membutuhkan signup, signin, verification, refresh token, signout, password reset, dan current-user session data.
- Internal operational process yang membutuhkan maintenance asset cleanup melalui script/command internal.

## 6. Global API Requirements

### 6.1 Access Boundary

- Public endpoint hanya endpoint yang secara eksplisit didefinisikan public.
- API documentation endpoints public meliputi `/`, `/openapi.json`, dan `/openapi.yaml`.
- Protected endpoint wajib menerima `Api-Key` valid.
- Authenticated endpoint wajib menerima `Api-Key` valid dan `Authorization: Bearer <accessToken>` valid.
- Endpoint yang membutuhkan role/permission wajib menolak user yang tidak memiliki permission yang sesuai.
- Missing/invalid API key menghasilkan `401 Unauthorized`.
- Missing/invalid/expired bearer token pada authenticated endpoint menghasilkan `401 Unauthorized`.
- Authenticated user yang tidak memiliki permission menghasilkan `403 Forbidden`.

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
pagination-total: <number>
pagination-page: <number>
pagination-limit: <number>
```

### 6.5 Security Headers

- API harus mengirim security headers yang relevan untuk mengurangi risiko clickjacking, MIME sniffing, referrer leakage, dan exposure lain.
- Header standar seperti `X-Frame-Options` dan `X-Content-Type-Options` boleh digunakan karena memang merupakan nama header keamanan yang masih umum dipakai.
- Custom application headers tidak menggunakan prefix `X-`.

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

| Method | Endpoint | Requirement |
| --- | --- | --- |
| POST | `/auth/signup` | Register user account |
| POST | `/auth/verify` | Verify email using verification token |
| POST | `/auth/signin` | Authenticate email/password and issue access + refresh tokens |
| POST | `/auth/refresh` | Rotate refresh token and issue a new token pair |
| POST | `/auth/signout` | Revoke refresh token |
| GET | `/auth/me` | Return current authenticated user profile and permissions |
| POST | `/auth/password/forgot` | Request password reset |
| POST | `/auth/password/reset` | Reset password using reset token |

### 8.2 Signup & Verification

- Signup membuat user normal dengan role `member`.
- Request signup tidak boleh bisa mengatur role, status, verification state, atau privileged fields lain.
- Nama user disimpan dalam bentuk trimmed.
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
- Signin yang berhasil mengembalikan safe user payload, access token, dan refresh token.
- Refresh token disimpan di PostgreSQL.
- Refresh token rotation wajib dilakukan saat `/auth/refresh` berhasil.
- Refresh token lama harus revoked setelah token baru dibuat.
- Refresh token yang invalid, expired, revoked, atau tidak ditemukan menghasilkan `401`.
- Signout merevoke refresh token dan bersifat idempotent.
- `/auth/me` mengembalikan safe user profile, role, dan permissions dari bearer token yang valid.

### 8.4 Password Reset

- Forgot password tidak boleh membuka informasi apakah email terdaftar atau tidak.
- Jika user ada, sistem membuat reset token baru, menyimpannya dalam bentuk hash, dan merevoke reset token aktif sebelumnya.
- Reset token memiliki masa berlaku terbatas.
- Reset password hanya berhasil dengan reset token yang valid, belum expired, dan belum revoked.
- Reset password yang berhasil memperbarui password hash dan merevoke reset token.

### 8.5 Email Notification Behavior

- Production flow mengirim email untuk verification dan password reset sesuai kebutuhan.
- Automated tests tidak boleh bergantung pada pengiriman email asli.
- Test/dev behavior untuk email ditangani melalui mailer adapter/mock/no-op environment, bukan melalui request-level testing flag di public API.

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

| Role | Permissions |
| --- | --- |
| `super_admin` | All permissions |
| `admin` | All permissions except `users.manage_role` and `users.manage_status` |
| `posts_manager` | `posts.manage`, `tags.manage` |
| `tokens_manager` | `tokens.manage`, `tags.manage` |
| `member` | No admin permissions |

## 10. Users Requirements

| Method | Endpoint | Requirement |
| --- | --- | --- |
| GET | `/users` | List users with pagination and filters |
| GET | `/users/{id}` | Get user detail |
| PATCH | `/users/{id}` | Update user profile |
| PUT | `/users/{id}/status` | Update user status |
| PUT | `/users/{id}/role` | Update user role |

- User list supports pagination, search by name/email, role filter, and status filter.
- User detail can be accessed by the owner or user with `users.read`.
- User profile can be updated by the owner or user with `users.update`.
- Status update requires `users.manage_status`.
- Role update requires `users.manage_role`.
- User response must not expose sensitive auth fields.

## 11. Posts Requirements

| Method | Endpoint | Requirement |
| --- | --- | --- |
| GET | `/posts` | List posts |
| POST | `/posts` | Create post |
| GET | `/posts/{id}` | Get post by UUID or slug |
| PATCH | `/posts/{id}` | Update post by UUID or slug |
| DELETE | `/posts/{id}` | Delete post by UUID or slug |

- Post list supports filters for statuses, sections, types, slugs, exclude, tags, search, page, and limit.
- Guest/member default visibility only returns published posts.
- Guest/member cannot explicitly request non-public statuses.
- Authorized content managers can access non-public statuses.
- List response excludes full `content`.
- Detail response includes full `content`.
- Cover image returns normalized asset metadata.
- Tag relation uses relational junction table, not array field.
- Create/update/delete require `posts.manage`.
- Duplicate slug returns conflict.

## 12. Tokens Requirements

| Method | Endpoint | Requirement |
| --- | --- | --- |
| GET | `/tokens` | List crypto tokens |
| POST | `/tokens` | Create token |
| GET | `/tokens/{id}` | Get token by UUID or slug |
| PATCH | `/tokens/{id}` | Update token by UUID or slug |
| DELETE | `/tokens/{id}` | Delete token by UUID or slug |
| GET | `/tokens/quotes` | Return quote/market data for requested token slugs |

- Token list supports filters for statuses, sharia statuses, slugs, exclude, tags, search, page, and limit.
- Guest/member default visibility excludes restricted/non-public statuses.
- Guest/member cannot explicitly request restricted/non-public statuses.
- Authorized token managers can access restricted/non-public statuses.
- List response excludes full `content`.
- Detail response includes full `content`.
- Logo returns normalized asset metadata.
- Tag relation uses relational junction table, not array field.
- Create/update/delete require `tokens.manage`.
- Duplicate slug or ticker returns conflict.
- Quote endpoint returns quote fields for requested token slugs.

## 13. Tags Requirements

| Method | Endpoint | Requirement |
| --- | --- | --- |
| GET | `/tags` | List tags |
| POST | `/tags` | Create tag |
| GET | `/tags/{id}` | Get tag by UUID or slug |
| PATCH | `/tags/{id}` | Update tag by UUID or slug |
| DELETE | `/tags/{id}` | Delete tag by UUID or slug |

- Tag list supports search, slug filter, page, and limit.
- Create/update/delete require `tags.manage`.
- Duplicate name or slug returns conflict.
- Delete without force returns conflict when tag is still used by posts or tokens.
- Delete conflict response includes usage counts for posts and tokens.
- Delete supports `force=true`.

## 14. Messages Requirements

| Method | Endpoint | Requirement |
| --- | --- | --- |
| POST | `/messages` | Create contact message |
| GET | `/messages` | List messages |
| GET | `/messages/{id}` | Get message detail |

- Message create accepts name, email, and message.
- Invalid email, empty message, invalid length, or invalid payload returns validation error.
- Message list supports search, sender filter, page, and limit.
- Message list/detail requires `messages.read`.

## 15. Assets Requirements

| Method | Endpoint | Requirement |
| --- | --- | --- |
| POST | `/assets` | Upload asset to Vercel Blob and persist metadata |
| POST | `/imgbb` | Upload image through ImgBB and preserve its metadata flow |

- `/assets` uses Vercel Blob in development and production.
- `/imgbb` uses ImgBB in development and production.
- Upload uses `multipart/form-data` with a file field.
- Maximum file size is 4MB unless configured otherwise.
- Upload requires `posts.manage` or `tokens.manage`.
- Successful upload stores asset metadata in PostgreSQL.
- Asset response includes normalized final URL and metadata.
- Missing file, empty file, invalid payload, or oversized file returns validation error.
- Storage provider failure returns provider failure error.
- Automated E2E tests fully mock both Vercel Blob and ImgBB integrations and must not perform real object storage network calls.
- Unit tests also mock storage provider integrations as needed.

## 16. Maintenance Requirements

- Asset cleanup must be available as an internal maintenance command/script.
- Asset cleanup must avoid deleting assets still referenced by users, posts, tokens, or other persisted records.
- Asset cleanup should not be exposed as a normal public/protected HTTP API endpoint unless there is a clear operational requirement.

## 17. Rate Limiting Requirements

- Rate limiting uses `@upstash/ratelimit` with Upstash Redis in production.
- Rate limiting applies only to the production environment.
- Production rate limiting applies to protected/private endpoints after API key validation.
- API docs endpoints may be excluded from rate limiting.
- Bucket key is based on client IP after trusted proxy/BFF boundary handling.
- Different client IP values must use separate buckets.
- Requests over limit return `429 Too Many Requests`.

## 18. Data Requirements

- PostgreSQL is the source of truth for users, auth tokens, refresh tokens, posts, tokens, tags, messages, assets, activity logs, and relationships.
- Production PostgreSQL provider is Neon.
- Database UUID behavior follows the existing schema behavior.
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
