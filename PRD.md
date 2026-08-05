# CryptoSharia API 2.0 — Product Requirements Document

## 1. Overview

**Problem**: CryptoSharia API versi lama (SvelteKit) menggunakan auth email+password, punya struktur role/content_status yang lebih kompleks dari kebutuhan, dan tidak punya fitur pembelajaran (Academy).

**Solusi**: Port ke NestJS dengan redesign auth (OTP email + Google OAuth), penyederhanaan schema, dan penambahan fitur Academy (course, subscription).

**Arsitektur**: Client (Svelte) → BFF (SvelteKit) → API (NestJS) → PostgreSQL + Redis. Client tidak pernah berkomunikasi langsung dengan API; semua request lewat BFF. API tidak menyimpan cookie apapun — hanya terima `Authorization`, `Api-Key`, `Forwarded` header dari BFF.

**Stack**: NestJS, PostgreSQL, Upstash Redis, Vercel, Resend, Vercel Blob, Zod, Drizzle ORM, Bun.

**Non-Goals** (di luar scope v2.0):

- Payment gateway otomatis (Midtrans/Xendit) — verifikasi pembayaran manual oleh admin.
- Multi-provider OAuth (hanya Google).
- Live session / video call terjadwal untuk lesson.
- Multi-tier subscription (hanya satu tier).
- Analytics/reporting dashboard.

---

## 2. Auth & Session

### 2.1 Metode Sign In

Dua metode, keduanya di-matching ke row yang sama di `users` berdasarkan `email` (unique). Tidak ada proses linking eksplisit terpisah — jika email sama, otomatis dianggap user yang sama.

### 2.2 Email OTP Flow

**Konstanta:**

- Panjang kode: 6 digit numerik (`000000`–`999999`).
- TTL kode: **5 menit** (300 detik).
- Maks percobaan verifikasi salah per kode: **5 kali**.
- Rate limit request OTP: **maks 3 request per email per 15 menit**.

**Endpoint & flow:**

1. `POST /auth/otp/request`
   - Body: `{ email: string }`.
   - Generate kode 6 digit acak.
   - `SET otp:{email} {code} EX 300`.
   - `DEL otp_attempts:{email}` (reset counter percobaan jika ada request baru — request OTP baru menggantikan yang lama sepenuhnya).
   - Kirim email berisi kode.
   - Response: `204 No Content`. Tidak membedakan "email terdaftar" vs "belum" pada response (mencegah enumerasi email) — user baru otomatis dibuat saat verifikasi sukses.
   - Rate limit terlampaui → `429 Too Many Requests`.

2. `POST /auth/otp/verify`
   - Body: `{ email: string, code: string }`.
   - Ambil `otp:{email}` dari Redis.
     - **Key tidak ada** (expired/belum pernah request) → `400 Bad Request`, error code `OTP_EXPIRED_OR_NOT_FOUND`.
     - **Key ada, `code` tidak cocok** → `INCR otp_attempts:{email}` (TTL disamakan dengan sisa TTL `otp:{email}`).
       - Jika counter setelah increment `>= 5` → `DEL otp:{email}` DAN `DEL otp_attempts:{email}` (paksa invalid, user harus request ulang) → response `400 Bad Request`, error code `OTP_MAX_ATTEMPTS_EXCEEDED`.
       - Jika counter `< 5` → response `400 Bad Request`, error code `OTP_INVALID`, body menyertakan `attemptsRemaining: number`.
     - **Key ada, `code` cocok** → `GETDEL otp:{email}` (single-use, hapus setelah dipakai) → `DEL otp_attempts:{email}` → cari `users` berdasarkan `email`:
       - Ketemu → pakai user itu.
       - Tidak ketemu → buat user baru (`role: member`, `status: active`, `name` diambil dari bagian sebelum `@` di email sebagai default, dapat diubah user nanti).
     - Buat session (lihat 2.4) → response `200 OK` dengan `{ accessToken, refreshToken }`.

### 2.3 Google OAuth Flow

Client secret Google hanya disimpan di API (env var), tidak pernah dikirim ke BFF. BFF berperan sebagai relay: menyimpan `code` dari Google lalu meneruskannya ke API.

1. `GET /auth/google/authorize-url?redirect_uri=<url>`
   - Dipanggil BFF. `redirect_uri` wajib ada di query param, ditentukan BFF sendiri (API tidak hardcode URL BFF apapun).
   - API generate Google OAuth authorization URL (scope: `openid email profile`) menggunakan `redirect_uri` yang dikirim.
   - Response: `200 OK`, `{ url: string }`.

2. BFF redirect browser ke `url` tersebut. User approve consent di Google. Google redirect balik ke `redirect_uri` (BFF) membawa query param `code`.

3. `POST /auth/google/exchange`
   - Dipanggil BFF. Body: `{ code: string, redirectUri: string }` (`redirectUri` harus identik dengan yang dipakai di step 1 — requirement OAuth spec).
   - API exchange `code` ke Google, dapat `id_token` berisi `sub`, `email`, `name`.
   - Matching/create user:
     1. Cari `oauth_accounts` dengan `(provider='google', provider_account_id=sub)`.
        - Ketemu → pakai `user_id` dari row itu.
        - Tidak ketemu → lanjut ke langkah 2.
     2. Cari `users` berdasarkan `email` dari Google response.
        - Ketemu → buat row `oauth_accounts` baru yang mengaitkan `user_id` tersebut dengan `(provider='google', provider_account_id=sub)`.
        - Tidak ketemu → buat `users` baru (`role: member`, `status: active`, `name` dari Google response) + buat `oauth_accounts`.
     3. Update `users.email` = email terbaru dari Google response (sync setiap login, apapun hasil matching di atas).
   - Buat session (lihat 2.4) → response `200 OK`, `{ accessToken, refreshToken }`.
   - Google `code` invalid/expired → `400 Bad Request`, error code `GOOGLE_CODE_INVALID`.

### 2.4 Session Management

**Konstanta:**

- Access token (JWT) TTL: **15 menit**.
- Refresh token TTL: **30 hari**, sliding (di-extend tiap kali dipakai untuk refresh).

**Struktur:**

- Refresh token yang dikirim ke client: string `{userId}:{tokenId}` (colon-separated). `tokenId` = random string (32 byte, hex-encoded).
- Redis key: `session:{userId}:{tokenId}` → value: ISO timestamp `createdAt` → `EX 2592000` (30 hari dalam detik).

**Flow:**

- **Buat session** (setelah OTP/Google sukses): generate `tokenId` baru → `SET session:{userId}:{tokenId} {now_iso} EX 2592000` → generate JWT access token (payload: `{ sub: userId, role, iat, exp }`) → return `{ accessToken, refreshToken: "{userId}:{tokenId}" }`.
- `POST /auth/refresh` — Body: `{ refreshToken: string }`.
  - Split `refreshToken` by `:` → jika format tidak valid (bukan 2 bagian) → `400 Bad Request`, error code `REFRESH_TOKEN_MALFORMED`.
  - `EXISTS session:{userId}:{tokenId}` → tidak ada → `401 Unauthorized`, error code `REFRESH_TOKEN_INVALID`.
  - Ada → `EXPIRE session:{userId}:{tokenId} 2592000` (extend TTL) → generate access token baru → response `200 OK`, `{ accessToken }` (refresh token TIDAK berubah, tetap yang lama).
- `POST /auth/signout` — Body: `{ refreshToken: string }`. `DEL session:{userId}:{tokenId}` → `204 No Content`.
- `POST /auth/signout-all` — Memerlukan `Authorization` header valid (bukan refresh token). `SCAN` dengan pattern `session:{userId}:*` (userId dari JWT payload) → `DEL` semua key yang match → `204 No Content`.
- **Tidak ada refresh token rotation.** Rotation hanya bermanfaat sebagai mekanisme deteksi (bukan pencegahan) pencurian token, dan manfaat itu hilang tanpa auto-revoke-all yang terpicu dari deteksi tersebut. Karena revoke-all sudah tersedia secara manual (signout-all), existence-check di Redis dianggap cukup untuk level risiko proyek ini. Trade-off: jika refresh token dicuri dan pelaku aktif menggunakannya, akses berlangsung sampai TTL 30 hari habis (sliding) kecuali user/admin memicu signout-all.

### 2.5 Header Structure (BFF → API, wajib di setiap request kecuali disebutkan public)

- `Authorization: Bearer <access_token>` — identitas user. Endpoint yang tidak butuh: `POST /auth/otp/request`, `POST /auth/otp/verify`, `GET /auth/google/authorize-url`, `POST /auth/google/exchange`, `POST /auth/refresh`, `POST /auth/signout`, `GET /certificates/:code`.
- `Api-Key: <bff_secret>` — wajib di SEMUA request tanpa kecuali (termasuk endpoint public di atas). Request tanpa/salah `Api-Key` → `401 Unauthorized` sebelum pengecekan lain dilakukan.
- `Forwarded: for=<end_client_ip>` — wajib di semua request. Diambil BFF dari `event.getClientAddress()` (SvelteKit).

---

## 3. Role & Permission

| Role     | Manage Content (posts, cryptoassets, courses, modules, lessons) | Approve/Reject Order                            | Manage Users | Enroll/Subscribe/Order | Akses Semua Course                                  |
| -------- | --------------------------------------------------------------- | ----------------------------------------------- | ------------ | ---------------------- | --------------------------------------------------- |
| `member` | ✗                                                               | ✗                                               | ✗            | ✓                      | Hanya yang dimiliki (enrollment/subscription aktif) |
| `editor` | ✓                                                               | ✗ (juga tidak bisa lihat order milik user lain) | ✗            | ✓                      | ✓ (bypass, tidak perlu enroll)                      |
| `admin`  | ✓                                                               | ✓                                               | ✓            | ✓                      | ✓ (bypass, tidak perlu enroll)                      |

Default role saat sign up: `member`.

---

## 4. Database Schema

Lihat file DBML terpisah (`cryptosharia-2.0-schema.dbml`) untuk definisi lengkap tabel, enum, index, dan constraint SQL. Ringkasan modul data:

- **Identity**: `users`, `oauth_accounts`
- **Content**: `posts`, `cryptoassets`, `assets`
- **Academy**: `courses`, `modules`, `lessons`, `orders`, `enrollments`, `subscriptions`, `certificates`
- **Misc**: `messages`

### 4.1 Business Rules — Course Acquisition

- **Course gratis** (`price = 0`): `POST /courses/:id/acquire` tanpa `proofImageId` → langsung buat row `enrollments` (`order_id = null`) → response `201 Created`.
- **Course berbayar** (`price > 0`): `POST /courses/:id/acquire` WAJIB kirim `proofImageId` → buat row `orders` (`course_id`, `amount = courses.price` pada saat itu, `status = pending`) → response `202 Accepted` (menunggu approval, BUKAN 201, karena belum ada `enrollments`).
- Jika `proofImageId` tidak dikirim padahal `price > 0` → `400 Bad Request`, error code `PROOF_REQUIRED`.
- Jika user sudah punya `enrollments` untuk course tersebut → `409 Conflict`, error code `ALREADY_ENROLLED`.
- Jika user sudah punya `orders` `status=pending` untuk course tersebut → `409 Conflict`, error code `ORDER_ALREADY_PENDING`.

### 4.2 Business Rules — Subscription Acquisition

- Konstanta harga (hardcoded di kode, BUKAN di database, agar tidak bisa dimanipulasi BFF/client):
  - `monthly`: Rp100.000, durasi 30 hari.
  - `yearly`: Rp1.000.000, durasi 365 hari.
- `POST /subscriptions/acquire` — Body: `{ period: 'monthly' | 'yearly', proofImageId?: string }`.
  - Harga & durasi diambil dari konstanta backend berdasarkan `period`, TIDAK dari body request.
  - Karena harga selalu > 0 untuk kedua tier (tidak ada tier gratis saat ini), `proofImageId` WAJIB. Jika di masa depan ada promo gratis, logic yang sama seperti 4.1 berlaku (tanpa proof, langsung approved).
  - Jika user sudah punya `subscriptions` aktif (`is_cancelled=false AND expires_at > now()`):
    - Buat `orders` (`subscription_period`, `status=pending`) seperti biasa.
    - **Saat admin approve** (bukan saat submit): jika masih ada subscription aktif milik user tersebut, **extend** `expires_at` yang ada (`expires_at_lama + durasi_baru`), bukan membuat row `subscriptions` baru. Jika tidak ada yang aktif, buat row `subscriptions` baru.
  - Response: `202 Accepted` (menunggu approval).

### 4.3 Business Rules — Order Approval

- `PUT /orders/:id/approve` — hanya `admin`. Precondition: `orders.status = 'pending'`, jika tidak → `409 Conflict`, error code `ORDER_ALREADY_DECIDED`.
  - Set `status = 'approved'`, `decided_at = now()`.
  - Jika `course_id` terisi → buat `enrollments` (`order_id` = order ini).
  - Jika `subscription_period` terisi → jalankan logic 4.2 (extend atau buat baru).
  - Kirim email ke `orders.user_id` (subjek: "Pembayaran Disetujui", isi: nama course/tipe subscription).
  - Response: `200 OK`.
- `PUT /orders/:id/reject` — hanya `admin`. Precondition sama (`status=pending`). Body opsional: `{ reason?: string }`.
  - Set `status = 'rejected'`, `decided_at = now()`.
  - Kirim email ke `orders.user_id` (subjek: "Pembayaran Ditolak", isi: `reason` jika ada).
  - Response: `200 OK`.

### 4.4 Business Rules — Progress & Certificate

- `POST /courses/:courseId/lessons/:lessonId/complete` — resolve `enrollments` dari `(user_id dari JWT, course_id dari path)`. Jika tidak ada `enrollments` DAN role bukan `editor`/`admin` → `403 Forbidden`.
  - Jika `lessonId` sudah ada di `completed_lesson_ids` → no-op, response `200 OK` (idempotent).
  - Jika belum → append `lessonId` ke array → cek: apakah semua `lessons.id` yang `module.course_id = courseId` sekarang ada di `completed_lesson_ids`?
    - Ya → generate `certificate_code` (format: `CS-{4 digit tahun}-{5 digit sequential/random}`, contoh `CS-2026-00042`) → coba `INSERT` ke `certificates`. Jika `(user_id, course_id)` sudah ada (unique constraint) → skip insert, tidak error (idempotent, course yang completed ulang setelah lesson baru ditambahkan tidak membuat certificate kedua).
  - Response: `200 OK`, `{ completedLessonIds: string[], courseCompleted: boolean, certificateIssued: boolean }`.
- Certificate bersifat snapshot: TIDAK dicabut/diganti jika course menambah lesson baru setelah certificate diterbitkan.

### 4.5 Business Rules — Akses Course untuk Editor/Admin

Access-check untuk melihat/mengakses isi course (module, lesson):

```
canAccess = (role IN ('editor', 'admin')) OR (enrollments exists) OR (subscriptions aktif exists)
```

Berlaku untuk endpoint yang menampilkan konten lesson (`content`). Endpoint listing course (`GET /courses`, `GET /courses/:id` metadata saja tanpa isi lesson) tetap bisa diakses publik tanpa auth.

---

## 5. API Endpoints

**Konvensi umum:**

- Semua endpoint `GET` list mendukung: `?page=1&limit=20` (default `page=1`, `limit=20`, maks `limit=100`), response menyertakan `{ data: T[], total: number, page: number, limit: number }`.
- Search: `?q=<keyword>` — dicocokkan terhadap kolom `title`/`name` (case-insensitive partial match) pada resource yang relevan.
- Filter tersedia per resource (didetailkan di masing-masing endpoint jika relevan).
- Error response format konsisten: `{ statusCode: number, errorCode: string, message: string }`.

### 5.1 Auth

| Method | Path                         | Auth         | Deskripsi                       |
| ------ | ---------------------------- | ------------ | ------------------------------- |
| POST   | `/auth/otp/request`          | Api-Key only | Kirim OTP ke email              |
| POST   | `/auth/otp/verify`           | Api-Key only | Verifikasi OTP, buat session    |
| GET    | `/auth/google/authorize-url` | Api-Key only | Generate Google OAuth URL       |
| POST   | `/auth/google/exchange`      | Api-Key only | Tukar code Google, buat session |
| POST   | `/auth/refresh`              | Api-Key only | Refresh access token            |
| POST   | `/auth/signout`              | Api-Key only | Signout satu device             |
| POST   | `/auth/signout-all`          | Full         | Signout semua device            |
| GET    | `/auth/me`                   | Full         | Info user yang sedang login     |

### 5.2 Users

| Method | Path                | Auth            | Deskripsi                                                         |
| ------ | ------------------- | --------------- | ----------------------------------------------------------------- |
| GET    | `/users`            | admin           | List user. Filter: `?role=`, `?status=`                           |
| GET    | `/users/:id`        | admin           | Detail user                                                       |
| PATCH  | `/users/:id`        | admin ATAU self | Update `name`/`avatarId`. TIDAK bisa ubah `role`/`status` di sini |
| PUT    | `/users/:id/status` | admin           | Ubah `status`                                                     |
| PUT    | `/users/:id/role`   | admin           | Ubah `role`                                                       |

### 5.3 Posts

| Method | Path         | Auth    | Deskripsi                                                                         |
| ------ | ------------ | ------- | --------------------------------------------------------------------------------- |
| GET    | `/posts`     | public  | Filter: `?section=`, `?status=` (non-admin/editor hanya lihat `status=published`) |
| POST   | `/posts`     | editor+ | Buat post baru, default `status=unpublished`                                      |
| GET    | `/posts/:id` | public* | *published only untuk non-editor                                                  |
| PATCH  | `/posts/:id` | editor+ |                                                                                   |
| DELETE | `/posts/:id` | editor+ |                                                                                   |

### 5.4 Crypto Assets

| Method | Path                | Auth    | Deskripsi                            |
| ------ | ------------------- | ------- | ------------------------------------ |
| GET    | `/cryptoassets`     | public  | Filter: `?shariaStatus=`, `?status=` |
| POST   | `/cryptoassets`     | editor+ |                                      |
| GET    | `/cryptoassets/:id` | public* |                                      |
| PATCH  | `/cryptoassets/:id` | editor+ |                                      |
| DELETE | `/cryptoassets/:id` | editor+ |                                      |

### 5.5 Assets

| Method | Path                  | Auth                 | Deskripsi                                                                                                                                                                                                   |
| ------ | --------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/assets`             | Full (authenticated) | Upload file ke Vercel Blob, return `assets.id`                                                                                                                                                              |
| POST   | `/ops/assets/cleanup` | admin                | Hapus `assets` yang tidak direferensikan tabel manapun (LEFT JOIN semua FK ke `assets`, ambil yang null di semua, hapus row + file fisik). Dijalankan manual via endpoint ini (bukan cron otomatis di v2.0) |

### 5.6 Messages

| Method | Path            | Auth                  | Deskripsi                       |
| ------ | --------------- | --------------------- | ------------------------------- |
| GET    | `/messages`     | admin                 |                                 |
| POST   | `/messages`     | public (Api-Key only) | Contact form, tidak perlu login |
| GET    | `/messages/:id` | admin                 |                                 |

### 5.7 Academy — Courses, Modules, Lessons

| Method | Path                         | Auth               | Deskripsi                                                                                                                       |
| ------ | ---------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/courses`                   | public             | Metadata saja (tanpa isi lesson). Filter: `?status=`                                                                            |
| POST   | `/courses`                   | editor+            |                                                                                                                                 |
| GET    | `/courses/:id`               | public             | Metadata + daftar module (tanpa isi lesson)                                                                                     |
| PATCH  | `/courses/:id`               | editor+            |                                                                                                                                 |
| DELETE | `/courses/:id`               | editor+            | Ditolak (`409`) jika ada `enrollments`/`orders` terkait — course tidak boleh dihapus jika sudah pernah diakses/dibeli siapa pun |
| GET    | `/courses/:courseId/modules` | public             |                                                                                                                                 |
| POST   | `/courses/:courseId/modules` | editor+            |                                                                                                                                 |
| PATCH  | `/modules/:id`               | editor+            |                                                                                                                                 |
| DELETE | `/modules/:id`               | editor+            |                                                                                                                                 |
| GET    | `/modules/:moduleId/lessons` | akses sesuai 4.5** | ** Jika tidak punya akses: return metadata (`title`, `order`) TANPA `content`                                                   |
| POST   | `/modules/:moduleId/lessons` | editor+            |                                                                                                                                 |
| PATCH  | `/lessons/:id`               | editor+            |                                                                                                                                 |
| DELETE | `/lessons/:id`               | editor+            |                                                                                                                                 |

### 5.8 Academy — Acquisition (Course & Subscription)

| Method | Path                     | Auth  | Deskripsi                                                      |
| ------ | ------------------------ | ----- | -------------------------------------------------------------- |
| POST   | `/courses/:id/acquire`   | Full  | Body: `{ proofImageId?: string }`. Lihat 4.1                   |
| POST   | `/subscriptions/acquire` | Full  | Body: `{ period, proofImageId? }`. Lihat 4.2                   |
| GET    | `/orders`                | Full  | admin: semua; member/editor: milik sendiri. Filter: `?status=` |
| PUT    | `/orders/:id/approve`    | admin | Lihat 4.3                                                      |
| PUT    | `/orders/:id/reject`     | admin | Body: `{ reason?: string }`. Lihat 4.3                         |

### 5.9 Academy — Progress & Ownership

| Method | Path                                            | Auth                               | Deskripsi                                                                                                          |
| ------ | ----------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| GET    | `/me/courses`                                   | Full                               | Semua course yang user punya akses (enrollment/subscription/bypass role), termasuk `completedLessonIds` per course |
| POST   | `/courses/:courseId/lessons/:lessonId/complete` | Full                               | Lihat 4.4                                                                                                          |
| GET    | `/me/subscription`                              | Full                               | Subscription aktif user (atau `null`)                                                                              |
| POST   | `/me/subscription/cancel`                       | Full                               | Set `is_cancelled=true`, `cancelled_at=now()`. `404` jika tidak ada subscription aktif                             |
| GET    | `/me/certificates`                              | Full                               | Daftar certificate milik user                                                                                      |
| GET    | `/certificates/:code`                           | Api-Key only (tanpa Authorization) | Public verification — return `{ userName, courseName, issuedAt }` atau `404` jika kode tidak valid                 |

---

## 6. Rate Limiting

Menggunakan `@upstash/ratelimit` dengan Redis yang sama dipakai session/OTP.

| Endpoint                                                   | Limit | Window                            | Identifier                 |
| ---------------------------------------------------------- | ----- | --------------------------------- | -------------------------- |
| `POST /auth/otp/request`                                   | 3     | 15 menit                          | `email` dari body          |
| `POST /auth/otp/verify`                                    | 5     | mengikuti TTL OTP aktif (5 menit) | `email` dari body          |
| `POST /courses/:id/acquire`, `POST /subscriptions/acquire` | 10    | 1 jam                             | `userId` dari JWT          |
| Global baseline (semua endpoint lain)                      | 100   | 1 menit                           | IP dari header `Forwarded` |

Response saat limit terlampaui: `429 Too Many Requests`, header `Retry-After` diisi detik tersisa.

---

## 7. Belum Diputuskan (TBD — API tidak boleh membuat asumsi diam-diam untuk hal ini, harus ditanyakan)

- Isi/template email (OTP, order approved, order rejected) — copywriting belum ada, sementara pakai teks placeholder.
- Format `avatarId`/upload avatar khusus user (apakah lewat `POST /assets` generik atau endpoint khusus).
- Apakah `GET /posts`, `GET /cryptoassets`, `GET /courses` perlu endpoint terpisah untuk "list milik saya" (draft yang dibuat editor tertentu) — saat ini semua editor bisa lihat semua konten termasuk unpublished.
