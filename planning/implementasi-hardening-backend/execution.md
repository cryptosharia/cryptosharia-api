# Execution: Implementasi Hardening Backend

## Context

Implementasi harus mengikuti `planning/implementasi-hardening-backend/spec.md`.

## Execution Order

1. Hardening auth/session flow.
2. Hardening trust boundary dan rate limit.
3. Refactor pattern route/helper/service secara pragmatis (tanpa memaksa route tipis).
4. Security regression tests.
5. Final verification + contract sync.

## Allowed Files

- `src/hooks.server.ts`
- `src/routes/**`
- `src/lib/auth/**`
- `src/lib/api/**`
- `src/lib/services/**`
- `src/lib/utils.ts`
- `src/vitest.setup.ts`
- `src/**/*.test.ts`

## Constraints

- Jangan ubah kontrak eksternal tanpa update spec dan approval.
- Hindari edit file yang tidak relevan.
- Prioritaskan perubahan yang menurunkan risiko security tertinggi lebih dulu.
- Jangan menjadikan aturan lama di `.agents/` sebagai baseline implementasi hardening.

## Escalation

- Perlu breaking change session/token.
- Perlu ubah kontrak API publik.
- Gagal 2x pada blocker yang sama.

## Done Definition

- Acceptance criteria terpenuhi.
- Verification command lulus.
- Ringkasan diff + dampak keamanan didokumentasikan.
- Tidak ada overengineering yang menurunkan keterbacaan route handler.

## Final Report Format

- Files changed
- Hasil `check/lint/test`
- Dampak keamanan
- Deviations dari spec
