# Spec: Finalisasi Best Practice Backend

## Goal

Menyelesaikan pass akhir hardening + maintainability agar behavior keamanan konsisten, boundary jelas, dan dokumentasi akurat.

## Non-Goals

- Menambah fitur bisnis baru.
- Mengganti arsitektur menjadi pola yang terlalu kompleks.
- Merombak kontrak API publik.

## Contracts

### Input

- Request existing ke endpoint private (`auth/users/posts/tokens/messages/imgbb`).
- Header trust boundary yang diproses di hook.

### Output

- Response tetap sesuai schema/contract saat ini.
- Error tetap dalam format `ApiResponse`.
- Tidak ada perubahan breaking contract.

### Validation Rules

- Semua body/query/params harus lewat parser helper terstandar.
- Tidak ada mass assignment di operasi DB write.
- Aksi privileged wajib authz check eksplisit.

## Behavior Rules

- Trust boundary diputuskan di hook; route/service tidak membaca forwarding header langsung.
- Session refresh tetap one-time consume-rotate (anti replay).
- Status code auth konsisten dan deterministic (`401/403/404` sesuai policy endpoint).
- Route tetap readable, ekstraksi service hanya untuk logic berulang/kompleks.

## Edge Cases

- Header `Forwarded` malformed/invalid.
- Refresh request paralel menggunakan token yang sama.
- User status berubah setelah token terbit.
- Akses user non-owner ke endpoint user-owned resource.

## Acceptance Criteria

- Invariants trust boundary, auth/session, dan authz/ownership tercapai dan teruji.
- Tidak ada endpoint prioritas yang keluar dari pattern parser/validation standar.
- Dokumentasi behavior sinkron dengan implementasi dan test.
- `check/lint/test` lulus.
