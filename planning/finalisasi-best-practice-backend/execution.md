# Execution: Finalisasi Best Practice Backend

## Context

Implementasi harus mengikuti `planning/finalisasi-best-practice-backend/spec.md`.

## Execution Order

1. Audit gap trust boundary + authz/authn behavior.
2. Patch kode kecil terarah untuk gap yang ditemukan.
3. Tambah/fix regression tests.
4. Sinkronisasi docs behavior.
5. Verifikasi final + closeout report.

## Allowed Files

- `src/hooks.server.ts`
- `src/routes/**`
- `src/lib/auth/**`
- `src/lib/api/**`
- `src/lib/services/**`
- `src/**/*.test.ts`
- `docs/api-spec.md`

## Constraints

- Jangan ubah kontrak eksternal tanpa update spec + approval.
- Hindari refactor besar di luar scope gap yang terbukti.
- Prioritaskan keamanan + konsistensi sebelum kerapihan kosmetik.

## Escalation

- Perlu breaking change behavior auth/session.
- Perlu perubahan kontrak API publik.
- Blocker yang sama gagal >2x.

## Done Definition

- Gap prioritas tertutup dengan perubahan minimal.
- Regression tests relevan bertambah dan hijau.
- Docs sinkron dengan behavior terbaru.
- `check/lint/test` lulus.

## Final Report Format

- Files changed
- Hasil `check/lint/test`
- Dampak keamanan
- Perubahan maintainability
- Accepted risks tersisa
