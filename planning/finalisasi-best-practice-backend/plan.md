# Plan: Finalisasi Best Practice Backend

## Objective

Menutup gap akhir agar backend konsisten, aman, dan maintainable dengan standar best practice pragmatis (tanpa overengineering).

## Scope

- Audit konsistensi authn/authz/error behavior di endpoint private.
- Final pass trust boundary (`locals.clientIp`) agar tidak ada parsing header forwarding langsung di route/service.
- Finalisasi konsistensi boundary route/service untuk domain prioritas (`auth`, `users`).
- Sinkronisasi dokumen behavior endpoint dengan implementasi + test terbaru.
- Validasi final `check/lint/test` dan closeout report.

## Out of Scope

- Penambahan endpoint bisnis baru.
- Perubahan kontrak API publik yang breaking tanpa approval eksplisit.
- Migrasi infra besar (mis. distributed rate limiter berbasis Redis) pada iterasi ini.

## Architecture Decisions

- Route `+server.ts` tetap menyimpan orchestration utama, bukan proxy tipis.
- Logic berulang/kompleks diekstrak ke service/helper yang reusable.
- Trust boundary ditetapkan di hooks sebagai source-of-truth (`event.locals.clientIp`).
- Kontrak API tetap contract-first via Zod + OpenAPI.

## File Change Map

- `src/hooks.server.ts` - final pass trust boundary/auth gate consistency.
- `src/routes/auth/**` - final pass auth/session behavior consistency.
- `src/routes/users/**` - final pass authz/ownership consistency.
- `src/lib/services/**` - ekstraksi logic berulang yang masih tersisa.
- `src/lib/api/**` - helper trust boundary/parsing jika perlu penyesuaian akhir.
- `src/routes/**/*.test.ts` - tambahan regression test untuk gap yang ditemukan.
- `docs/api-spec.md` - sinkronisasi behavior aktual.

## Risks and Mitigations

- Risk: Drift behavior auth karena refactor akhir.
  Mitigation: fokus perubahan kecil, tambah regression test sebelum final verify.
- Risk: Scope melebar ke refactor besar.
  Mitigation: hanya sentuh area yang punya duplikasi/risiko nyata.
- Risk: Dokumen tidak sinkron dengan implementasi.
  Mitigation: docs lock dilakukan setelah semua test hijau.

## Acceptance Criteria

- Tidak ada route/service yang parsing forwarding header langsung di luar trust boundary hook.
- Auth/session invariants utama tercover test dan lulus konsisten.
- Boundary route/service di domain prioritas lebih konsisten tanpa menurunkan readability.
- `docs/api-spec.md` sinkron dengan behavior aktual.
- `npm run check`, `npm run lint`, `npm test` lulus.

## Verification

- `npm run check`
- `npm run lint`
- `npm test`
