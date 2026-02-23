# Ringkasan Refactor (Detail)

Dokumen ini menjelaskan perubahan refactor secara rinci dengan bahasa yang lebih mudah dicerna, terutama kalau kamu sudah familiar dengan struktur kode sebelum refactor.

Fokus utama siklus ini adalah **maintainability, konsistensi, dan keterbacaan**, bukan nambah fitur baru.

---

## Kenapa refactor ini dilakukan

Sebelum refactor, sistem sudah berjalan, tapi biaya maintenance mulai naik karena:

1. Banyak handler route mengulang pola parsing/validasi request yang sama.
2. Registrasi OpenAPI masih mengandalkan agregasi manual yang rawan kelupaan.
3. Test integration cukup banyak duplikasi setup dan assertion.
4. Import schema DB masih cenderung monolitik.
5. Dokumentasi campur antara gaya teknis dan gaya naratif, naming belum seragam.

Tujuan refactor: bikin kode lebih mudah dirawat jangka panjang tanpa mengubah perilaku bisnis secara sengaja.

---

## Cakupan dan batasan

### Masuk cakupan

- Refactor internal route handlers.
- Perapihan organisasi OpenAPI.
- Refactor test agar lebih DRY dan mudah dibaca.
- Perapihan struktur docs + naming file.
- Penambahan artefak planning untuk hardening dan maintainability.

### Tidak masuk cakupan

- Tidak menambah fitur produk baru.
- Tidak merombak total domain model bisnis.
- Tidak memaksa arsitektur yang bikin route jadi proxy 1 baris.

---

## Keputusan arsitektur selama proses

### 1) Route harus tetap "punya isi"

Sempat dicoba pendekatan `src/domains/*` yang membuat route jadi sangat tipis (proxy ke layer lain). Pendekatan ini ditolak karena:

- route jadi kurang informatif,
- sulit dipahami saat baca endpoint flow langsung dari file route,
- berpotensi overengineering untuk kebutuhan sekarang.

Keputusan final:

- orchestration tetap ada di route,
- yang diekstrak adalah boilerplate teknis (parse/validate), bukan alur endpoint utama.

### 2) Hindari ergonomi import yang buruk

Penempatan root arsitektur baru langsung di `src/` sempat bikin import terasa berat (deep relative). Keputusan final:

- ikuti pola project yang sudah ada,
- lakukan langkah aman non-breaking dulu (facade schema), baru split besar kalau memang perlu.

---

## Perubahan utama per area

## 1) Migrasi OpenCode + setup workspace AI

Ditambahkan:

- `opencode.json`
- `AGENTS.md`
- `.agents/rules/*`
- `.agents/skills/*`
- planning:
  - `planning/implementasi-hardening-backend/`
  - `planning/refactor-struktur-maintainability/`

Manfaat:

- workflow AI jadi konsisten dan lokal di repo,
- aturan/skill lebih jelas,
- jejak plan/spec/tasks/execution terdokumentasi.

---

## 2) Refactor route handler (maintainability)

### Kondisi sebelumnya

Banyak route mengulang pola:

- parsing body/query,
- validasi,
- format error handling.

### Perubahan

Ditambahkan helper parsing request:

- `src/lib/api/request.ts` (sumber utama helper parse request)

Helper ini dipakai lintas handler, termasuk di:

- `src/routes/auth/me/+server.ts`
- `src/routes/auth/refresh/+server.ts`
- `src/routes/auth/signin/+server.ts`
- `src/routes/auth/signout/+server.ts`
- `src/routes/auth/signup/+server.ts`
- `src/routes/auth/verify/+server.ts`
- `src/routes/users/+server.ts`
- `src/routes/users/[id=uuid]/+server.ts`
- `src/routes/users/[id=uuid]/role/+server.ts`
- `src/routes/users/[id=uuid]/status/+server.ts`
- `src/routes/posts/+server.ts`
- `src/routes/tokens/+server.ts`
- `src/routes/tokens/quotes/+server.ts`
- `src/routes/messages/+server.ts`

Hasil:

- boilerplate berkurang,
- alur bisnis endpoint lebih kelihatan,
- konsistensi validasi meningkat.

---

## 3) Refactor organisasi OpenAPI

### Kondisi sebelumnya

Registrasi OpenAPI masih rentan drift karena agregasi manual.

### Perubahan

- Tiap module route mengekspor array route (`authRoutes`, `usersRoutes`, dst).
- Ditambahkan registry pusat:
  - `src/routes/openapi.json/registry.ts`
- Generator OpenAPI konsumsi registry ini:
  - `src/routes/openapi.json/+server.ts`

Module yang dinormalkan export-nya:

- `src/routes/(docs)/index.ts`
- `src/routes/openapi.json/index.ts`
- `src/routes/auth/index.ts`
- `src/routes/users/index.ts`
- `src/routes/posts/index.ts`
- `src/routes/tokens/index.ts`
- `src/routes/messages/index.ts`
- `src/routes/imgbb/index.ts`
- `src/routes/seed/index.ts`

Hasil:

- tambah endpoint baru jadi lebih aman dari risiko tidak terdaftar di OpenAPI,
- struktur route specs lebih rapi dan predictable.

---

## 4) Modularity schema DB (langkah facade)

Ditambahkan modul schema per area:

- `src/lib/db/schema/auth.ts`
- `src/lib/db/schema/content.ts`
- `src/lib/db/schema/assets.ts`
- `src/lib/db/schema/messaging.ts`
- `src/lib/db/schema/activity.ts`
- `src/lib/db/schema/index.ts`

Tujuan:

- bikin import enum/schema lebih jelas konteksnya,
- jadi fondasi untuk split bertahap dari struktur monolitik.

---

## 5) Refactor test suite (besar)

Ini area dengan dampak maintainability paling terasa.

### A) Ekspansi helper test

Di `src/lib/test-utils.ts` ditambah helper reusable:

- `createVerifiedTestUserWithPassword(password, overrides?)`
  - mengurangi setup hash password berulang.
- `insertTestRefreshToken(userId, { expired?, revoked? })`
  - menghilangkan duplikasi seed refresh token.

### B) Refactor test auth

File terkait:

- `src/routes/auth/signin/signin.test.ts`
- `src/routes/auth/refresh/refresh.test.ts`
- `src/routes/auth/signout/signout.test.ts`
- `src/routes/auth/signup/signup.test.ts`
- `src/routes/auth/verify/verify.test.ts`
- `src/routes/auth/me/me.test.ts`

Perubahan utama:

- banyak case repetitif dipindah ke `it.each`,
- setup berulang dibungkus helper lokal (`signup(...)`, `getMeWithToken(...)`, dll),
- assertion tetap menjaga behavior yang sama.

### C) Refactor test users/posts/tokens/messages/hook

File terkait:

- `src/routes/users/users.test.ts`
- `src/routes/posts/posts.test.ts`
- `src/routes/tokens/tokens.test.ts`
- `src/routes/messages/messages.test.ts`
- `src/hooks.server.test.ts`

Perubahan utama:

- grouping skenario forbidden/negative jadi lebih ringkas,
- konsistensi pattern assertion meningkat,
- noise test berkurang tanpa mengorbankan coverage intent.

### D) Yang sengaja tidak diubah banyak

- `src/routes/ratelimit.test.ts`
  - dibiarkan relatif apa adanya karena sudah cukup kecil dan fokus.

Hasil keseluruhan:

- lebih gampang nambah test case baru,
- lebih kecil peluang inkonsistensi antar test serupa,
- onboarding ke test suite lebih cepat.

---

## 6) Perubahan dokumentasi

### A) Normalisasi nama file docs (kebab-case)

Sekarang dokumen utama:

- `docs/api-docs.md`
- `docs/auth-flow.md`
- `docs/api-spec.md`
- `docs/refactor-summary.md`

### B) Rework `api-spec`

`docs/api-spec.md` disesuaikan jadi versi human summary berbasis behavior test:

- endpoint bisa apa,
- butuh apa,
- behavior allowed/blocked yang sudah tervalidasi.

### C) Update referensi

Referensi ke nama docs lama sudah diperbarui di:

- `GEMINI.md`
- `planning/TASKS.md`

---

## Dampak terhadap behavior

### Tujuan dampak

- Tidak ada perubahan behavior produk yang disengaja.
- Fokus pada konsistensi, struktur, dan readability.

### Area yang tetap perlu verifikasi lokal

- parity parse/validate setelah helperisasi,
- parity registrasi OpenAPI,
- edge cases auth/session setelah test refactor.

---

## Inventaris file penting (high signal)

### File inti baru

- `src/lib/api/request.ts`
- `src/routes/openapi.json/registry.ts`
- `src/lib/db/schema/*`

### File test paling banyak disentuh

- `src/lib/test-utils.ts`
- `src/routes/auth/*/*.test.ts`
- `src/routes/users/users.test.ts`
- `src/routes/posts/posts.test.ts`
- `src/routes/tokens/tokens.test.ts`
- `src/routes/messages/messages.test.ts`
- `src/hooks.server.test.ts`

### File docs terkait

- `docs/api-spec.md`
- `docs/refactor-summary.md`

---

## Langkah lanjutan yang direkomendasikan

1. Jalankan verifikasi penuh di environment lokal kamu (`check`, `lint`, `test`).
2. Review diff auth/status guard untuk memastikan tidak ada semantic drift.
3. Split commit berdasarkan concern biar histori tetap bersih:
   - refactor test,
   - refactor maintainability route/OpenAPI,
   - update docs + rename docs.
