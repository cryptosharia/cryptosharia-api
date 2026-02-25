# Tasks: Finalisasi Best Practice Backend

- [x] Audit endpoint private untuk konsistensi authn/authz/error behavior.
- [x] Audit trust boundary: pastikan tidak ada parsing forwarding header di route/service.
- [x] Finalisasi boundary route/service domain prioritas (`auth`, `users`).
- [x] Tambah/fix regression test untuk gap yang ditemukan.
- [x] Sinkronkan `docs/api-spec.md` dengan behavior aktual.
- [x] Jalankan verifikasi final (`check/lint/test`).
- [x] Buat closeout report (files changed, security impact, accepted risks).

## Definition of Done

- [x] Acceptance criteria di `spec.md` terpenuhi.
- [x] `npm run check`, `npm run lint`, `npm test` lulus.
- [x] Tidak ada drift antara implementasi, test, dan docs.
- [x] Ringkasan final terdokumentasi.

## Execution Log

- 2026-02-25: Audit endpoint private dilakukan; ditemukan inkonsistensi status code unauthorized pada `GET/PATCH /users/{id}`.
- 2026-02-25: Perbaikan auth behavior diterapkan di `src/routes/users/[id=uuid]/+server.ts` (`401` untuk unauthenticated, `403` untuk authenticated-insufficient-permission).
- 2026-02-25: Regression tests ditambahkan di `src/routes/users/users.test.ts` untuk unauthorized detail/update path.
- 2026-02-25: Audit trust boundary final: tidak ditemukan parsing forwarding header langsung di route/service (hanya di `src/hooks.server.ts`).
- 2026-02-25: Verifikasi final hijau (`npm run check`, `npm run lint`, `npm test`) dengan hasil 13 test files dan 120 tests lulus.
- 2026-02-25: Closeout final: accepted risk tersisa adalah limiter masih in-memory untuk deployment distributed multi-instance.
