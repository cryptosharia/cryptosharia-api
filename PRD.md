# CryptoSharia API 2.0 — Product Requirements Document

## 1. Overview

**Problem**: CryptoSharia API versi lama (SvelteKit) menggunakan auth email+password, punya struktur role/content_status yang lebih kompleks dari kebutuhan, dan tidak punya fitur pembelajaran (Academy).

**Solusi**: Port ke NestJS dengan redesign auth (OTP email + Google OAuth), penyederhanaan schema, dan penambahan fitur Academy (course, subscription).

**Arsitektur**: Client (Svelte) → BFF (SvelteKit) → API (NestJS) → PostgreSQL + Redis. Client tidak pernah berkomunikasi langsung dengan API; semua request lewat BFF. API tidak menyimpan cookie apapun — hanya terima `Authorization`, `Api-Key`, `Forwarded` header dari BFF. Semua endpoint API wajib memakai `Api-Key`, kecuali endpoint dokumentasi publik: `GET /`, `GET /openapi.json`, dan `GET /openapi.yaml`.

**Stack**: NestJS, PostgreSQL, Upstash Redis, Vercel, Resend, Vercel Blob, Zod, Drizzle ORM, Bun.

**Non-Goals** (di luar scope v2.0):

- Payment gateway otomatis (Midtrans/Xendit) — verifikasi pembayaran manual oleh admin.
- Multi-provider OAuth (hanya Google).
- Live session / video call terjadwal untuk lesson.
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
- Hash OTP: `HMAC-SHA256(OTP_SECRET, normalizedEmail + ":" + code)`.

**Endpoint & flow:**

1. `POST /auth/otp/request`
   - Body: `{ email: string }`.
   - Generate kode 6 digit acak.
   - Simpan hash OTP, bukan kode mentah: `SET otp:{email} {otp_hash} EX 300`.
   - `DEL otp_attempts:{email}` (reset counter percobaan jika ada request baru — request OTP baru menggantikan yang lama sepenuhnya).
   - Kirim email berisi kode.
   - Response: `204 No Content`. Tidak membedakan "email terdaftar" vs "belum" pada response (mencegah enumerasi email) — user baru otomatis dibuat saat verifikasi sukses.
   - Rate limit terlampaui → `429 Too Many Requests`.

2. `POST /auth/otp/verify`
   - Body: `{ email: string, code: string }`.
   - Ambil `otp:{email}` dari Redis.
     - **Key tidak ada** (expired/belum pernah request) → `400 Bad Request`, error code `OTP_INVALID_OR_EXPIRED`.
     - **Key ada, hash dari `code` tidak cocok** → `INCR otp_attempts:{email}` (TTL disamakan dengan sisa TTL `otp:{email}`).
       - Jika counter setelah increment `>= 5` → `DEL otp:{email}` DAN `DEL otp_attempts:{email}` (paksa invalid, user harus request ulang) → response `429 Too Many Requests`, error code `OTP_MAX_ATTEMPTS_EXCEEDED`.
       - Jika counter `< 5` → response `400 Bad Request`, error code `OTP_INVALID_OR_EXPIRED`, body menyertakan `attemptsRemaining: number`.
     - **Key ada, hash dari `code` cocok** → `GETDEL otp:{email}` (single-use, hapus setelah dipakai) → `DEL otp_attempts:{email}` → cari `users` berdasarkan `email`:
       - Ketemu → pakai user itu.
       - Tidak ketemu → buat user baru (`role: member`, `status: active`, `name` diambil dari bagian sebelum `@` di email sebagai default, dapat diubah user nanti).
     - Buat session (lihat 2.4) → response `200 OK` dengan `{ accessToken, refreshToken }`.

### 2.3 Google OAuth Flow

Client secret Google hanya disimpan di API (env var), tidak pernah dikirim ke BFF. BFF berperan sebagai relay: menyimpan `code` dari Google lalu meneruskannya ke API.

1. `GET /auth/google/url?redirect_uri=<url>`
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
     3. Setelah `oauth_accounts` terhubung, signin berikutnya menggunakan `provider_account_id` (`sub`) sebagai identitas utama Google. API TIDAK auto-sync `users.email` dari Google response agar perubahan email provider tidak menabrak unique email user lain. Jika nanti perlu menyimpan email provider terbaru, tambahkan kolom terpisah seperti `oauth_accounts.provider_email`.
   - Buat session (lihat 2.4) → response `200 OK`, `{ accessToken, refreshToken }`.
   - Google `code` invalid/expired → `400 Bad Request`, error code `GOOGLE_CODE_INVALID`.

### 2.4 Session Management

**Konstanta:**

- Access token (JWT) TTL: **15 menit**.
- Refresh token TTL: **30 hari**, sliding (di-extend tiap kali dipakai untuk refresh).

**Struktur:**

- Refresh token yang dikirim ke client: string `{userId}:{tokenId}` (colon-separated). `tokenId` = random string (32 byte, hex-encoded).
- Redis key: `session:{userId}:{tokenIdHash}` → value: ISO timestamp `createdAt` → `EX 2592000` (30 hari dalam detik). `tokenIdHash = HMAC-SHA256(REFRESH_TOKEN_SECRET, tokenId)`, sehingga dump Redis tidak cukup untuk merekonstruksi refresh token.

**Flow:**

- **Buat session** (setelah OTP/Google sukses): generate `tokenId` baru dari 32 byte cryptographically secure random, hex-encoded → hash `tokenId` → `SET session:{userId}:{tokenIdHash} {now_iso} EX 2592000` → generate JWT access token (payload: `{ sub: userId, role, iat, exp }`) → return `{ accessToken, refreshToken: "{userId}:{tokenId}" }`.
- `POST /auth/refresh` — Body: `{ refreshToken: string }`.
  - Jika `refreshToken` tidak valid, malformed, expired, atau session key tidak ada → `401 Unauthorized`, error code `REFRESH_TOKEN_INVALID`.
  - Jika format valid, split `refreshToken` by `:` lalu hash `tokenId` → `EXISTS session:{userId}:{tokenIdHash}`.
  - Ada → `EXPIRE session:{userId}:{tokenIdHash} 2592000` (extend TTL) → generate access token baru → response `200 OK`, `{ accessToken }` (refresh token TIDAK berubah, tetap yang lama).
- `POST /auth/signout` — Body: `{ refreshToken: string }`. Hash `tokenId` → `DEL session:{userId}:{tokenIdHash}` → `204 No Content`.
- `POST /auth/signout-all` — Memerlukan `Authorization` header valid (bukan refresh token). `SCAN` dengan pattern `session:{userId}:*` (userId dari JWT payload) → `DEL` semua key yang match → `204 No Content`.
- **Tidak ada refresh token rotation.** Rotation hanya bermanfaat sebagai mekanisme deteksi (bukan pencegahan) pencurian token, dan manfaat itu hilang tanpa auto-revoke-all yang terpicu dari deteksi tersebut. Karena revoke-all sudah tersedia secara manual (signout-all), existence-check di Redis dianggap cukup untuk level risiko proyek ini. Trade-off: jika refresh token dicuri dan pelaku aktif menggunakannya, akses berlangsung sampai TTL 30 hari habis (sliding) kecuali user/admin memicu signout-all.

### 2.5 Header Structure (BFF → API, wajib di setiap request kecuali disebutkan public)

- `Authorization: Bearer <access_token>` — identitas user. Wajib untuk endpoint user-specific, create/update/delete content, upload asset, acquisition, orders, progress, dan admin/editor operations.
- `Api-Key: <bff_secret>` — wajib di semua request kecuali endpoint dokumentasi publik di bawah. Request tanpa/salah `Api-Key` → `401 Unauthorized` sebelum pengecekan lain dilakukan.
- `Forwarded: for=<end_client_ip>` — wajib di semua request. Diambil BFF dari `event.getClientAddress()` (SvelteKit). API memakai header ini untuk rate limit IP karena request diasumsikan berasal dari BFF yang memegang `Api-Key` valid.

**Pengecualian `Api-Key`:** `GET /`, `GET /openapi.json`, dan `GET /openapi.yaml` boleh diakses publik agar dokumentasi API mudah dibuka.

**Endpoint tanpa `Authorization` tetapi tetap wajib `Api-Key`:** auth public actions (`POST /auth/otp/request`, `POST /auth/otp/verify`, `GET /auth/google/url`, `POST /auth/google/exchange`, `POST /auth/refresh`, `POST /auth/signout`), public content reads (`GET /posts`, `GET /posts/:id` untuk published content, `GET /cryptoassets`, `GET /cryptoassets/:id` untuk published content, `GET /courses` tanpa `scope=mine`, `GET /courses/:id`), `GET /subscription-tiers`, dan `GET /certificates/:code`.

---

## 3. Role & Permission

| Role     | Manage Content (posts, cryptoassets, courses, modules, lessons) | Approve/Reject Order                            | Manage Users | Enroll/Subscribe/Order |
| -------- | --------------------------------------------------------------- | ----------------------------------------------- | ------------ | ---------------------- |
| `member` | ✗                                                               | ✗                                               | ✗            | ✓                      |
| `editor` | ✓                                                               | ✗ (juga tidak bisa lihat order milik user lain) | ✗            | ✓                      |
| `admin`  | ✓                                                               | ✓                                               | ✓            | ✓                      |

Default role saat sign up: `member`.

Role menentukan kemampuan operasional (content management, user management, order management). Akses course dan progress **semua user** — termasuk editor/admin — ditentukan oleh enrollment. Tanpa enrollment, user tidak bisa mengakses konten course. Pengecualian: editor/admin bisa preview lesson content (`GET /lessons/:id`) tanpa enrollment untuk keperluan edit/preview di dashboard internal.

Tidak ada auto-provision enrollment untuk subscriber — subscriber tetap wajib `POST /courses/:id/acquire` per course (skip bagian order karena subscription aktif).

Acquisition untuk semua user:

- **Course gratis** (`price = 0`): langsung enrollment (`grant_type = 'free'`), akses permanen.
- **Course berbayar** (`price > 0`) + user punya subscription aktif: langsung enrollment (`grant_type = 'subscription'`), akses temporer — validasi live terhadap subscription di tabel `subscriptions`. Saat subscription lapse, akses mati; progress & certificate tetap.
- **Course berbayar** (`price > 0`) + user tidak punya subscription aktif: wajib `proofImageId` → order pending → admin approve → enrollment (`grant_type = 'order'`), akses permanen.

Endpoint `GET /courses?scope=mine` mengembalikan semua course yang user punya enrollment (grant_type apa pun, valid atau expired).

---

## 4. Database Schema

Lihat file DBML terpisah (`cryptosharia-2.0-schema.dbml`) untuk definisi lengkap tabel, enum, index, dan constraint SQL. Ringkasan modul data:

- **Identity**: `users`, `oauth_accounts`
- **Content**: `posts`, `cryptoassets`, `assets`
- **Academy**: `courses`, `modules`, `lessons`, `orders`, `enrollments`, `subscriptions`, `certificates`

### 4.1 Business Rules — Course Acquisition

- **`published_at`**: kolom di-set ke `now()` saat status pertama kali berubah ke `published` (yaitu saat `status = 'published'` DAN `published_at IS NULL`). Setelah terisi, tidak pernah diubah lagi — ini adalah tanggal original publication. Public visibility untuk semua content item (posts, cryptoassets, courses): `status = 'published' AND published_at <= now()`.

- **Course gratis** (`price = 0`): `POST /courses/:id/acquire` — langsung buat row `enrollments` (`grant_type = 'free'`, `order_id = null`). Akses permanen. Response `201 Created`.

- **Course berbayar** (`price > 0`) + user punya subscription aktif (`is_cancelled=false AND expires_at > now()`): `POST /courses/:id/acquire` — langsung buat row `enrollments` (`grant_type = 'subscription'`, `order_id = null`). Akses temporer — validasi live apakah user masih punya subscription aktif. Saat subscription berakhir (expired/`is_cancelled=true`), akses ke enrollment ini mati; `completed_lesson_ids` dan certificate tetap tersimpan. Response `201 Created`.

- **Course berbayar** (`price > 0`) + user tidak punya subscription aktif: `POST /courses/:id/acquire` WAJIB kirim `proofImageId` → buat row `orders` (`course_id`, `amount = courses.price` pada saat itu, `status = pending`). Response `202 Accepted` (menunggu approval, belum ada `enrollments`). Saat admin approve → buat `enrollments` (`grant_type = 'order'`, `order_id = order ini`), akses permanen.

- **Upgrade enrollment dari temp ke permanen**: user dengan enrollment `grant_type = 'subscription'` yang subscription sudah lapsed → boleh `POST /courses/:id/acquire` ulang. Jika saat ini user punya subscription aktif lagi → enrollment ditingkatkan (grant_type tetap 'subscription', valid lagi). Jika user ingin beli via order → buat order; saat approve → `grant_type` enrollment diubah ke `'order'`, `order_id` di-set. Response mengikuti flow standar. Gak kena `409 ALREADY_ENROLLED` karena akses saat ini tidak valid.

- Jika `proofImageId` tidak dikirim padahal `price > 0` dan user tidak punya subscription aktif → `400 Bad Request`, error code `PROOF_REQUIRED`.

- Jika user sudah punya `enrollments` valid (akses aktif) untuk course tersebut → `409 Conflict`, error code `ALREADY_ENROLLED`. Enrollment yang tidak valid (subscription lapsed) tidak memicu error ini.

- Jika user sudah punya `orders` `status=pending` untuk course tersebut → `409 Conflict`, error code `ORDER_ALREADY_PENDING`.

### 4.2 Business Rules — Subscription Acquisition

- Tier subscription tersimpan di tabel `subscription_tiers` (source of truth), di-edit oleh admin via `PATCH /subscription-tiers/:id`. Tidak ada konstanta harga di kode.
- `subscription_tiers` adalah satu-satunya tabel yang perlu di-seed saat setup. Seed awal: `name: 'Monthly', price: 100000, durationDays: 30` dan `name: 'Yearly', price: 1000000, durationDays: 365`.
- `POST /subscriptions/acquire` — Body: `{ tierId: string, proofImageId?: string }`.
  - Harga diambil dari row `subscription_tiers` berdasarkan `tierId`, dihitung server-side, TIDAK dari body request. `tierId` tidak ada → `404`, error code `TIER_NOT_FOUND`.
  - Snapshot `price` → `orders.amount` dan `duration_days` → `orders.subscription_duration_days` saat acquire. Ganti harga/durasi tier setelah acquire tidak mengubah order yang sudah masuk — keduanya ke-snapshot.
  - Karena semua tier harga > 0 (tidak ada tier gratis saat ini), `proofImageId` WAJIB. Jika di masa depan ada promo gratis, logic yang sama seperti 4.1 berlaku (tanpa proof, langsung approved).
  - Jika user sudah punya `subscriptions` aktif (`is_cancelled=false AND expires_at > now()`):
    - Buat `orders` (`subscription_tier_id`, `status=pending`) seperti biasa.
    - **Saat admin approve** (bukan saat submit): jika masih ada subscription aktif milik user tersebut, **extend** `expires_at` yang ada (`expires_at lama + durasi_baru`), bukan membuat row `subscriptions` baru. `durasi_baru` diambil dari **`orders.subscription_duration_days` milik order renewal yang sedang di-approve**. Jika tidak ada yang aktif, buat row `subscriptions` baru.
  - Response: `202 Accepted` (menunggu approval).

### 4.3 Business Rules — Order Approval

- `PUT /orders/:id/approve` — hanya `admin`. Precondition: `orders.status = 'pending'`, jika tidak → `409 Conflict`, error code `ORDER_ALREADY_DECIDED`.
  - Set `status = 'approved'`, `confirmed_at = now()`.
  - Jika `course_id` terisi → buat `enrollments` (`grant_type = 'order'`, `order_id` = order ini).
  - Jika `subscription_tier_id` terisi → jalankan logic 4.2 (extend atau buat baru).
  - Kirim email ke `orders.user_id` (subjek: "Pembayaran Disetujui", isi: nama course/tipe subscription).
  - Response: `200 OK`.
- `PUT /orders/:id/reject` — hanya `admin`. Precondition sama (`status=pending`). Body opsional: `{ reason?: string }`.
  - Set `status = 'rejected'`, `confirmed_at = now()`.
  - Kirim email ke `orders.user_id` (subjek: "Pembayaran Ditolak", isi: `reason` jika ada).
  - Response: `200 OK`.

### 4.4 Business Rules — Progress & Certificate

- `POST /lessons/:id/complete` — resolve course dari lesson (`lesson → module → course`), lalu resolve `enrollments` dari `(user_id dari JWT, course_id hasil resolve)`. Jika tidak ada `enrollments` → `403 Forbidden`, error code `ENROLLMENT_REQUIRED`. Tidak ada bypass role untuk completion — **semua role termasuk editor/admin wajib memiliki enrollment**.
  - Jika `lessonId` sudah ada di `completed_lesson_ids` → no-op, response `200 OK` (idempotent).
  - Jika belum → append `lessonId` ke array → cek: apakah semua `lessons.id` yang `module.course_id = courseId` sekarang ada di `completed_lesson_ids`?
    - Ya → generate `certificate_code` (format: `CS-{4 digit tahun}-{5 digit sequential/random}`, contoh `CS-2026-00042`) → coba `INSERT` ke `certificates`. Jika `(user_id, course_id)` sudah ada (unique constraint) → skip insert, tidak error (idempotent, course yang completed ulang setelah lesson baru ditambahkan tidak membuat certificate kedua).
  - Response: `200 OK`, `{ completedLessonIds: string[], courseCompleted: boolean, certificateIssued: boolean }`.
- Certificate bersifat snapshot: TIDAK dicabut/diganti jika course menambah lesson baru setelah certificate diterbitkan.
- `completed_lesson_ids` tetap disimpan sebagai array di `enrollments` untuk v2.0. Backend wajib memvalidasi bahwa `lessonId` benar-benar berada di dalam course yang ter-resolve sebelum append.
- `GET /courses/:id` mencantumkan `completed: boolean` di setiap lesson object **jika** request authenticated dan user memiliki enrollment untuk course tersebut (valid atau expired — progress adalah riwayat milik user, tidak hilang saat akses lapse). Public atau user yang tidak punya enrollment → field tidak muncul.

### 4.5 Business Rules — Akses Lesson Content

Access-check untuk melihat konten lesson (`GET /lessons/:id`):

```
canAccessContent = (role IN ('editor', 'admin')) OR (enrollment valid exists)
```

Enrollment valid didefinisikan oleh kolom `enrollments.grant_type`:

| `grant_type`   | Kondisi valid                                                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `free`         | Selalu valid (permanen)                                                                                                            |
| `order`        | Selalu valid (permanen, dibuat saat order approved)                                                                                |
| `subscription` | Valid selama user punya subscription aktif (`is_cancelled=false AND expires_at > now()`). Setelah subscription lapse → tidak valid |

Tanpa akses, `GET /lessons/:id` return `403 Forbidden`, error code `COURSE_ACCESS_REQUIRED`. `GET /courses/:id` tetap bisa diakses publik tanpa auth dan mencantumkan semua module + lesson metadata (tanpa `content`). `completed: boolean` pada lesson object muncul jika user memiliki enrollment (valid atau expired);

### 4.6 Business Rules — Course, Module, Lesson Deletion

- `DELETE /courses/:id` ditolak jika course sudah punya `orders`, `enrollments`, atau `certificates` terkait → `409 Conflict`, error code `COURSE_ALREADY_ACQUIRED`.
- `DELETE /modules/:id` ditolak jika course dari module tersebut sudah punya `orders`, `enrollments`, atau `certificates` terkait → `409 Conflict`, error code `COURSE_ALREADY_ACQUIRED`.
- `DELETE /lessons/:id` ditolak jika course dari lesson tersebut sudah punya `orders`, `enrollments`, atau `certificates` terkait → `409 Conflict`, error code `COURSE_ALREADY_ACQUIRED`.
- Rule ini ditegakkan di backend service layer agar response error tetap eksplisit dan konsisten. Database tetap memakai FK/constraint dasar, bukan trigger business-rule kompleks.

### 4.7 Business Rules — Assets Lifecycle

- Tidak ada endpoint cleanup asset di API. Cleanup asset abandoned dilakukan via script dev (`scripts/cleanup-assets.ts`), dijalankan manual oleh developer, bukan bagian dari aplikasi.
- Script menggunakan satu sumber kebenaran daftar semua kolom FK ke `assets` (`ASSET_REFERENCES`: `users.avatar_id`, `cryptoassets.logo_id`, `posts.cover_image_id`, `courses.cover_image_id`, `orders.proof_image_id`). Nambah FK baru ke `assets` berarti menambah satu entry di daftar ini.
- Script hanya menghapus asset yang tidak direferensikan kolom mana pun DAN `created_at` lebih tua dari ambang batas (misal > 1 jam), agar window upload→attach tidak kena.
- Asset lama yang ditinggal saat resource di-update/di-delete dihapus secara opportunistic dalam transaksi API yang sama, jika asset tersebut sudah tidak direferensikan tabel lain. Sebelum menghapus file fisik dan row `assets`, backend wajib mengecek semua kolom FK asset yang relevan.
- `orders.proof_image_id` tidak dihapus otomatis selama order masih ada karena menjadi bukti pembayaran/audit record.
- Tidak ada endpoint delete order di v2.0; order hanya bisa berpindah status dari `pending` ke `approved` atau `rejected`.

### 4.8 Transaction Requirements

Operasi berikut wajib dijalankan dalam DB transaction:

- Google signin saat perlu membuat `users` dan/atau `oauth_accounts`.
- OTP verify saat perlu membuat `users`.
- Free course acquisition: cek existing enrollment/order lalu buat `enrollments` (grant_type 'free').
- Paid course acquisition: cek existing enrollment/pending order lalu buat `orders`.
- Subscription-based course acquisition (course berbayar + subscription aktif): cek existing enrollment lalu buat `enrollments` (grant_type 'subscription').
- Subscription purchase (`POST /subscriptions/acquire`): buat `orders`.
- Order approval: update `orders`, buat `enrollments` (grant_type 'order') atau extend/buat `subscriptions`.
- Order rejection: update `orders`.
- Lesson completion (`POST /lessons/:id/complete`): update `completed_lesson_ids` dan issue `certificates` jika course selesai.
- Update/delete resource yang mengganti atau menghapus asset reference.
- Delete course/module/lesson setelah precondition check.

### 4.9 Email Delivery

- Semua email dikirim via Resend.
- OTP signin email dikirim ke user saat `POST /auth/otp/request` sukses.
- Order approved/rejected email dikirim ke user setelah admin approve/reject order.

### 4.10 Content Management Ownership

- Tidak ada ownership per content item di v2.0 untuk `posts`, `cryptoassets`, dan `courses`.
- Semua `editor` dan `admin` bisa melihat dan mengelola semua content, termasuk `unpublished`.
- Tidak ada endpoint khusus "draft milik saya" di v2.0.

---

## 5. API Endpoints

**Konvensi umum:**

- Semua endpoint `GET` list mendukung: `?page=1&limit=20` (default `page=1`, `limit=20`, maks `limit=100`), response menyertakan `{ data: T[], total: number, page: number, limit: number }`.
- Search: `?q=<keyword>` — dicocokkan terhadap kolom `title`/`name` (case-insensitive partial match) pada resource yang relevan.
- Filter tersedia per resource (didetailkan di masing-masing endpoint jika relevan).
- Query params memakai `snake_case`. Body dan response JSON memakai `camelCase`. Database columns memakai `snake_case`.
- Error response format konsisten: `{ statusCode: number, errorCode: string, message: string }`.
- `Auth = public` berarti tidak membutuhkan `Authorization`, tetapi tetap membutuhkan `Api-Key` kecuali endpoint dokumentasi publik di 2.5.
- Default sort pada endpoint `GET` list: kolom `order` (modules, lessons) → `order ASC`; kolom `published_at` (posts, cryptoassets, courses) → `published_at DESC`; lainnya (users, orders, certificates, subscription-tiers) → `created_at DESC`.

### 5.1 Auth

| Method | Path                    | Auth         | Deskripsi                       |
| ------ | ----------------------- | ------------ | ------------------------------- |
| POST   | `/auth/otp/request`     | Api-Key only | Kirim OTP ke email              |
| POST   | `/auth/otp/verify`      | Api-Key only | Verifikasi OTP, buat session    |
| GET    | `/auth/google/url`      | Api-Key only | Generate Google OAuth URL       |
| POST   | `/auth/google/exchange` | Api-Key only | Tukar code Google, buat session |
| POST   | `/auth/refresh`         | Api-Key only | Refresh access token            |
| POST   | `/auth/signout`         | Api-Key only | Signout satu device             |
| POST   | `/auth/signout-all`     | Full         | Signout semua device            |
| GET    | `/auth/me`              | Full         | Info user yang sedang signin    |

### 5.2 Users

| Method | Path                | Auth            | Deskripsi                                                                                             |
| ------ | ------------------- | --------------- | ----------------------------------------------------------------------------------------------------- |
| GET    | `/users`            | admin           | List user. Filter: `?role=`, `?status=`                                                               |
| GET    | `/users/:id`        | admin           | Detail user                                                                                           |
| PATCH  | `/users/:id`        | admin ATAU self | Update `name`/`avatarId`. Avatar memakai `assets.id`. TIDAK bisa ubah `role`/`status` di endpoint ini |
| PUT    | `/users/:id/status` | admin           | Ubah `status`                                                                                         |
| PUT    | `/users/:id/role`   | admin           | Ubah `role`                                                                                           |

### 5.3 Posts

| Method | Path         | Auth    | Deskripsi                                                                                              |
| ------ | ------------ | ------- | ------------------------------------------------------------------------------------------------------ |
| GET    | `/posts`     | public  | Public hanya lihat `published`. Editor/admin bisa filter `?status=published\|unpublished`, `?section=` |
| POST   | `/posts`     | editor+ | Buat post baru, default `status=unpublished`                                                           |
| GET    | `/posts/:id` | public* | Public hanya bisa membaca post `published`. Editor/admin bisa membaca semua status                     |
| PATCH  | `/posts/:id` | editor+ | Update post                                                                                            |
| DELETE | `/posts/:id` | editor+ | Delete post                                                                                            |

### 5.4 Crypto Assets

| Method | Path                | Auth    | Deskripsi                                                                                                    |
| ------ | ------------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| GET    | `/cryptoassets`     | public  | Public hanya lihat `published`. Editor/admin bisa filter `?status=published\|unpublished`, `?sharia_status=` |
| POST   | `/cryptoassets`     | editor+ | Buat crypto asset baru, default `status=unpublished`                                                         |
| GET    | `/cryptoassets/:id` | public* | Public hanya bisa membaca crypto asset `published`. Editor/admin bisa membaca semua status                   |
| PATCH  | `/cryptoassets/:id` | editor+ | Update crypto asset                                                                                          |
| DELETE | `/cryptoassets/:id` | editor+ | Delete crypto asset                                                                                          |

### 5.5 Assets

| Method | Path      | Auth                 | Deskripsi                                      |
| ------ | --------- | -------------------- | ---------------------------------------------- |
| POST   | `/assets` | Full (authenticated) | Upload file ke Vercel Blob, return `assets.id` |

### 5.6 Academy — Courses, Modules, Lessons

| Method | Path                         | Auth        | Deskripsi                                                                                                                    |
| ------ | ---------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/courses`                   | public/Full | Katalog course. Public hanya lihat `published`; `?scope=mine` membutuhkan Full dan return course yang user punya enrollment  |
| POST   | `/courses`                   | editor+     |                                                                                                                              |
| GET    | `/courses/:id`               | public/Full | Detail course + modules + lessons metadata. Jika authenticated & enrolled: tiap lesson menyertakan `completed: boolean`      |
| PATCH  | `/courses/:id`               | editor+     |                                                                                                                              |
| DELETE | `/courses/:id`               | editor+     | Ditolak (`409`) jika ada `orders`/`enrollments`/`certificates` terkait. Lihat 4.6                                            |
| POST   | `/courses/:courseId/modules` | editor+     |                                                                                                                              |
| PATCH  | `/modules/:id`               | editor+     |                                                                                                                              |
| DELETE | `/modules/:id`               | editor+     | Ditolak (`409`) jika course terkait sudah pernah punya `orders`/`enrollments`/`certificates`. Lihat 4.6                      |
| GET    | `/lessons/:id`               | Full        | Jika punya akses (enrollment valid atau editor/admin): return metadata + `content`; jika tidak: `403 COURSE_ACCESS_REQUIRED` |
| POST   | `/modules/:moduleId/lessons` | editor+     |                                                                                                                              |
| PATCH  | `/lessons/:id`               | editor+     |                                                                                                                              |
| DELETE | `/lessons/:id`               | editor+     | Ditolak (`409`) jika course terkait sudah pernah punya `orders`/`enrollments`/`certificates`. Lihat 4.6                      |

### 5.7 Academy — Acquisition (Course & Subscription)

| Method | Path                      | Auth             | Deskripsi                                                              |
| ------ | ------------------------- | ---------------- | ---------------------------------------------------------------------- |
| GET    | `/subscription-tiers`     | public (Api-Key) | Daftar tier subscription yang tersedia (id, name, price, durationDays) |
| PATCH  | `/subscription-tiers/:id` | admin            | Edit `{ name?, price?, durationDays? }`. `404` jika tier tidak ada     |
| POST   | `/courses/:id/acquire`    | Full             | Body: `{ proofImageId?: string }`. Lihat 4.1                           |
| POST   | `/subscriptions/acquire`  | Full             | Body: `{ tierId, proofImageId? }`. Lihat 4.2                           |
| GET    | `/orders`                 | Full             | admin: semua; member/editor: milik sendiri. Filter: `?status=`         |
| PUT    | `/orders/:id/approve`     | admin            | Lihat 4.3                                                              |
| PUT    | `/orders/:id/reject`      | admin            | Body: `{ reason?: string }`. Lihat 4.3                                 |

### 5.8 Academy — Learning Progress & Certificates

| Method | Path                            | Auth                               | Deskripsi                                                                                                                            |
| ------ | ------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| POST   | `/lessons/:id/complete`         | Full                               | Mark lesson selesai; issue certificate otomatis jika semua lesson course selesai. Lihat 4.4                                          |
| GET    | `/subscriptions/current`        | Full                               | Subscription aktif user. `404` jika tidak ada subscription aktif                                                                     |
| POST   | `/subscriptions/current/cancel` | Full                               | Set `is_cancelled=true`, `cancelled_at=now()`. `404` jika tidak ada subscription aktif                                               |
| GET    | `/certificates`                 | Full                               | Daftar certificate milik user                                                                                                        |
| GET    | `/certificates/:code`           | Api-Key only (tanpa Authorization) | Public verification — return `{ userName, userEmailMasked, courseName, issuedAt, certificateCode }` atau `404` jika kode tidak valid |

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

## 7. Email Templates

Email copy final boleh disesuaikan saat implementasi, tetapi API harus menyediakan minimal template berikut:

- **OTP signin** — subject: `Kode Masuk CryptoSharia`; body berisi kode OTP, masa berlaku 5 menit, dan instruksi abaikan email jika user tidak meminta kode.
- **Order approved** — subject: `Pembayaran Disetujui`; body berisi nama course atau tipe subscription yang sudah aktif.
- **Order rejected** — subject: `Pembayaran Ditolak`; body berisi nama course atau tipe subscription, alasan penolakan jika admin mengisi `reason`, dan instruksi upload ulang bukti pembayaran jika diperlukan.
