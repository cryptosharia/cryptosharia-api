# Tasks: Refactor Struktur & Maintainability

- [x] Audit duplikasi pattern route (parsing/validasi/error) dan tetapkan helper standar.
- [x] Refactor `auth` untuk konsistensi parsing/validasi tanpa menjadikan route sekadar proxy tipis.
- [x] Refactor `users` dengan prinsip yang sama (orchestration tetap jelas di route).
- [x] Standarisasi route `messages/posts/tokens` untuk parsing/query handling konsisten.
- [x] Konsolidasi helper request ke satu sumber di `src/lib/api/request.ts` (hapus duplikasi path helper).
- [x] Rapikan organisasi OpenAPI agar registrasi route tidak manual/rawan drift.
- [x] Tambahkan facade modular untuk schema DB sebagai langkah non-breaking.
- [x] Update/rapikan test agar lebih DRY, konsisten, dan mudah dibaca.
- [x] Rapikan dokumentasi endpoint menjadi human summary berbasis behavior test (`docs/api-spec.md`).
- [x] Normalisasi nama file dokumentasi ke kebab-case (`docs/*.md`).
- [x] Jalankan verification penuh dan dokumentasikan hasil (dijalankan di environment lokal user).

## Definition of Done

- [x] Acceptance criteria utama maintainability di `spec.md` tercapai secara substansial.
- [x] Route prioritas lebih konsisten tanpa mengorbankan keterbacaan orchestration.
- [x] Tidak ada perubahan behavior yang disengaja pada endpoint prioritas (refactor-only intent).
- [x] Struktur dokumentasi dan ringkasan refactor terbarui sesuai implementasi aktual.
- [x] `npm run check`, `npm run lint`, `npm test` lulus (final verification di mesin lokal user).

## Execution Log

- 2026-02-23: Audit duplikasi route selesai; helper parsing request distandarkan.
- 2026-02-23: Refactor route `auth`, `users`, `messages`, `posts`, `tokens` dilakukan dengan pendekatan non-proxy.
- 2026-02-23: Registrasi OpenAPI dipusatkan melalui `src/routes/openapi.json/registry.ts`.
- 2026-02-23: Facade modular schema DB ditambahkan di `src/lib/db/schema/*`.
- 2026-02-23: Refactor test integration lintas domain selesai (table-driven + helper reuse).
- 2026-02-23: Dokumentasi endpoint human-summary dibuat/dirapikan di `docs/api-spec.md`.
- 2026-02-23: Helper request dikonsolidasikan ke `src/lib/api/request.ts`; path `src/lib/http/request.ts` dihapus.
- 2026-02-23: Nama file docs dinormalisasi ke kebab-case (`api-docs.md`, `auth-flow.md`, `api-spec.md`).
- 2026-02-23: Verifikasi penuh dikonfirmasi lulus di environment lokal user (`check`, `lint`, `test`).
