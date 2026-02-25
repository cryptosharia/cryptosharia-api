# Tasks: Implementasi Hardening Backend

- [x] Milestone 1: Hardening sesi auth (refresh/signout/signin) + test replay.
- [x] Milestone 2: Hardening trust boundary di `hooks.server.ts` + rate limiting policy.
- [x] Milestone 3: Standarisasi helper parsing/validasi route untuk kurangi boilerplate.
- [x] Milestone 4: Refactor domain logic secara pragmatis (prioritas auth/users, tanpa memaksa route jadi proxy tipis).
- [x] Milestone 5: Tambah security regression tests lintas endpoint prioritas.
- [x] Milestone 6: Sinkronisasi OpenAPI + validasi akhir.
- [x] Milestone 0 (meta): Pastikan baseline hardening tidak bergantung pada rules/skills lama di `.agents/`.

## Definition of Done

- [x] Acceptance criteria di `spec.md` terpenuhi.
- [x] `npm run check`, `npm run lint`, `npm test` lulus.
- [x] Perubahan terdokumentasi dan tidak ada drift kontrak API.

## Execution Log

- 2026-02-23: Planning disinkronkan ke keputusan terbaru (route tetap meaningful, hardening berbasis best practice aktual, `.agents` tidak dijadikan baseline).
- 2026-02-23: Milestone 2 selesai: rate limit dipindah hanya ke endpoint private setelah validasi `Api-Key`.
- 2026-02-23: Trust boundary diperbarui ke header standar `Forwarded` (RFC 7239) dengan parser terpusat + fallback `event.getClientAddress()`.
- 2026-02-23: Source of truth `clientIp` dipusatkan di `event.locals.clientIp`; route/service tidak lagi membaca header forwarding langsung.
- 2026-02-23: Test rate limit diperbarui sesuai policy baru (public tanpa RL, private dengan RL, bucket by `Forwarded`).
- 2026-02-23: Milestone 1 selesai: flow refresh diperkeras menjadi one-time atomic consume-rotate (anti replay race).
- 2026-02-23: Ditambahkan test concurrency refresh token (dua request paralel pada token sama -> satu `200`, satu `401`).
- 2026-02-23: Verifikasi akhir dikonfirmasi hijau (`check`, `lint`, `test`).
- 2026-02-23: Milestone 3 selesai: route validation diseragamkan dan cast berisiko di upload endpoint diperketat (`File` guard via `instanceof`).
- 2026-02-23: Ditambahkan regression test parser trust boundary (`src/lib/api/trust-boundary.test.ts`).
- 2026-02-23: Milestone 5 ditambah: regression test auth refresh ketika status user berubah setelah token diterbitkan.
- 2026-02-23: Milestone 5 ditambah: regression test hook untuk `Forwarded` malformed agar fallback tetap aman.
- 2026-02-23: Milestone 4 diselesaikan secara pragmatis dengan ekstraksi logic domain ke service reusable:
  - `src/lib/services/auth-session.ts` untuk rotate refresh session (atomic consume-rotate)
  - `src/lib/services/users.ts` untuk fetch/update detail user (profile/status/role)
    Route tetap memegang orchestration, tanpa berubah jadi proxy tipis.
- 2026-02-23: Milestone 6 selesai: sinkronisasi dokumentasi behavior (`docs/api-spec.md`) dan verifikasi akhir dikonfirmasi hijau.
