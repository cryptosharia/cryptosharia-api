# Plan: Implementasi Hardening Backend

## Objective

Meningkatkan keamanan, maintainability, dan konsistensi arsitektur `cryptosharia-api` ke level production-grade.

## Scope

- Hardening autentikasi/sesi (refresh token rotation, replay safety, invalidation).
- Hardening trust boundary (IP forwarding, rate limit strategy, auth context).
- Standarisasi pola route handler (parsing, validasi, error mapping) agar minim boilerplate.
- Refactor modularitas domain secara pragmatis (extract logic berulang/kompleks, hindari overengineering).
- Tambah regression test untuk security-critical path.

## Out of Scope

- Penambahan fitur bisnis baru (academy/store/community flows baru).
- Migrasi infra besar di luar kebutuhan hardening (contoh: full service mesh).

## Architecture Decisions

- Kontrak API tetap contract-first via Zod + OpenAPI.
- Route `+server.ts` tetap jadi orchestration yang terbaca; boilerplate parsing/validasi dipusatkan di helper.
- Hardening dieksekusi berbasis best practice implementasi aktual, tidak bergantung pada aturan lama di `.agents/`.
- Security checklist jadi gate wajib sebelum merge.
- Rollout dilakukan bertahap dengan compatibility mode untuk meminimalkan risiko.

## File Change Map

- `src/hooks.server.ts` - hardening auth/rate limit/proxy trust.
- `src/routes/auth/**` - refactor sesi, signin/refresh/signout flow.
- `src/lib/auth/**` - policy, session utility, token hardening.
- `src/lib/api/**` - helper validasi/parsing/error standar.
- `src/lib/services/**` - ekstraksi logic domain yang benar-benar memberi nilai maintainability.
- `src/routes/**/*.test.ts` - security regression + concurrency tests.
- `src/vitest.setup.ts` - util test untuk skenario hardening.

## Risks and Mitigations

- Risk: Breaking session behavior (forced logout).
  Mitigation: feature flag + migration window + komunikasi release notes.
- Risk: Regression di endpoint existing.
  Mitigation: tambah test contract + integration per endpoint prioritas.
- Risk: Scope creep refactor.
  Mitigation: eksekusi per milestone, freeze scope tiap milestone.

## Acceptance Criteria

- Tidak ada replay race pada refresh token (dibuktikan test concurrency).
- Session invalidation berjalan saat role/status user berubah.
- Pattern parsing/validasi route konsisten di endpoint prioritas.
- Security regression suite hijau untuk auth, users, messages, posts, tokens.
- OpenAPI contract tetap sinkron dengan implementasi.

## Verification

- `npm run check`
- `npm run lint`
- `npm test`
