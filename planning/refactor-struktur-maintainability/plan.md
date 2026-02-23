# Plan: Refactor Struktur & Maintainability

## Objective

Merestrukturisasi kode backend agar lebih modular, konsisten, mudah dirawat, dan siap scale tanpa mengubah behavior API secara sembarangan.

## Scope

- Refactor struktur project berdasarkan domain (auth, users, posts, tokens, messages).
- Menstandarkan route handler (`+server.ts`) agar konsisten pada parsing/validasi, sambil tetap mempertahankan orchestration endpoint di route.
- Standarisasi parsing/validasi request, error mapping, dan response mapping.
- Rapikan boundary util/helper dan organisasi OpenAPI agar lebih jelas dan minim drift.
- Rapikan konvensi coding yang benar-benar dipakai implementasi.

## Out of Scope

- Menambah fitur bisnis baru.
- Replatforming framework/ORM.
- Migrasi infrastruktur eksternal yang tidak terkait maintainability codebase.

## Architecture Decisions

- Contract-first tetap dipertahankan (Zod + OpenAPI).
- `index.ts` di route tetap jadi pusat kontrak endpoint.
- Hindari overengineering: route tidak dijadikan proxy tipis; flow endpoint tetap terbaca dari route.
- Utility parsing/validasi dibuat reusable untuk kurangi boilerplate.
- Refactor dilakukan inkremental per domain, bukan big-bang rewrite.

## File Change Map

- `src/routes/**/+server.ts` - standarisasi parsing/validasi + jaga keterbacaan orchestration.
- `src/routes/**/index.ts` - tetap jadi source kontrak, dirapikan naming konsistensi.
- `src/lib/api/**` - helper standar untuk request parsing/validation/response/errors.
- `src/lib/db/**` - persiapan split schema/repo untuk modularitas.
- `src/lib/utils.ts` - sentralisasi helper request parsing yang sudah dipakai lintas route.
- `src/**/*.test.ts` - update test agar sesuai layering baru.

## Risks and Mitigations

- Risk: refactor memicu regression behavior endpoint.
  Mitigation: migration per domain + integration tests aktif di setiap langkah.
- Risk: overengineering struktur.
  Mitigation: hanya ekstrak logic yang berulang/kompleks; hindari abstraksi prematur.
- Risk: kontrak OpenAPI drift.
  Mitigation: route contract tidak dipindah dari `index.ts`; validasi contract setelah tiap milestone.

## Acceptance Criteria

- Boilerplate parsing/validasi route berkurang signifikan.
- Route handler prioritas (auth/users/messages) fokus ke orchestration, bukan business logic berat.
- Struktur folder/domain lebih jelas ownership-nya.
- Konvensi implementasi konsisten lintas endpoint.
- Registrasi OpenAPI tidak lagi rawan drift manual.
- `check/lint/test` tetap lulus setelah refactor.

## Verification

- `npm run check`
- `npm run lint`
- `npm test`
