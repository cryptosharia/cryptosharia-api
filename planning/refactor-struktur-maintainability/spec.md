# Spec: Refactor Struktur & Maintainability

## Goal

Meningkatkan maintainability codebase dengan arsitektur yang konsisten, testable, dan minim duplikasi, sambil menjaga stabilitas API.

## Non-Goals

- Mengubah kontrak API publik tanpa persetujuan.
- Menulis ulang seluruh codebase sekaligus.

## Contracts

### Input

- Endpoint existing di `src/routes/**`.
- Kontrak Zod/OpenAPI existing di `src/routes/**/index.ts`.

### Output

- Struktur implementasi lebih modular (route konsisten dan tetap bermakna, util/helper jelas).
- Reusable helper untuk parsing/validasi/error handling.
- Kontrak endpoint tetap kompatibel (kecuali disepakati perubahan).

### Validation Rules

- Semua request body/query/params tetap tervalidasi schema.
- Tidak ada direct DB passthrough ke response.
- Hindari overengineering: route tidak dipaksa jadi proxy tipis tanpa nilai baca.

## Behavior Rules

- Route hanya menerima request, validasi awal, panggil service, lalu return response.
- Orchestration endpoint tetap terbaca jelas di route; ekstraksi dilakukan untuk boilerplate berulang.
- Mapping response tetap whitelist lewat schema parse.

## Edge Cases

- Endpoint dengan role/ownership rule bercabang (users, posts/tokens preview).
- Endpoint dengan side-effect eksternal (email/imgbb/cmc).
- Query parser multi-value yang saat ini tidak konsisten antar route.

## Acceptance Criteria

- Minimal domain `auth` dan `users` selesai distandarkan tanpa mengorbankan keterbacaan route.
- Helper parsing query/body dipakai konsisten lintas route prioritas.
- Reduksi duplikasi kode di route endpoint prioritas.
- Test existing tetap hijau, plus coverage skenario refactor kritikal.
