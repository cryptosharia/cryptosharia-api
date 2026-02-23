# Execution: Refactor Struktur & Maintainability

## Context

Implementasi mengikuti `planning/refactor-struktur-maintainability/spec.md`.

## Execution Order

1. Standardisasi helper parsing/validasi untuk route.
2. Refactor domain `auth` (konsistensi parse/validate + route tetap jelas).
3. Refactor domain `users`.
4. Harmonisasi domain `messages/posts/tokens`.
5. Rapikan registrasi OpenAPI + modular facade schema DB.
6. Final pass test + dokumentasi.

## Allowed Files

- `src/routes/**`
- `src/lib/api/**`
- `src/lib/services/**`
- `src/lib/auth/**`
- `src/lib/utils.ts`
- `src/**/*.test.ts`

## Constraints

- Jangan ubah kontrak API tanpa approval.
- Hindari refactor lintas domain sekaligus dalam satu langkah besar.
- Prioritaskan perubahan dengan ROI maintainability tertinggi.

## Escalation

- Diperlukan perubahan kontrak endpoint yang tidak backward-compatible.
- Blocker arsitektur yang memerlukan perubahan di luar scope file di atas.
- Dua kali gagal pada pendekatan refactor yang sama.

## Done Definition

- Route prioritas konsisten dengan pattern baru.
- Route tetap bermakna (bukan proxy tipis) dan boilerplate berulang berkurang.
- Registrasi OpenAPI terpusat dan minim risiko drift manual.
- Regression tests lulus.
- Ringkasan refactor dan dampaknya terdokumentasi.

## Final Report Format

- Files changed
- Pengurangan duplikasi yang dicapai
- Hasil check/lint/test
- Risiko tersisa + next steps
