# Spec: Implementasi Hardening Backend

## Goal

Menghasilkan backend yang aman, mudah dirawat, dan konsisten tanpa mengorbankan stabilitas kontrak API yang sudah dipakai consumer internal.

## Non-Goals

- Mendesain ulang seluruh domain bisnis.
- Menambah endpoint baru yang tidak terkait hardening/refactor.

## Contracts

### Input

- Request existing ke endpoint auth/users/posts/tokens/messages.
- Event auth (signin, refresh, signout, role/status update).

### Output

- Respons API tetap mengikuti schema Zod + OpenAPI existing.
- Error response tetap dalam format `ApiResponse`.
- Security-sensitive path menolak akses tidak valid secara deterministic.

### Validation Rules

- Semua body/query/params diparse via schema, bukan dipakai langsung.
- Tidak boleh ada mass assignment pada operasi DB write.
- Privileged action wajib authz check eksplisit + ownership check jika relevan.

## Behavior Rules

- Refresh token hanya bisa dipakai sekali (atomic consume-rotate).
- Token/session lama tidak tetap valid saat status/role berubah sesuai policy.
- Rate limit identity tidak boleh bergantung ke header spoofable tanpa trust boundary jelas.
- Route handler tetap jelas secara orchestration; ekstraksi ke helper/service dilakukan hanya saat mengurangi duplikasi/kompleksitas nyata.
- Semua keputusan hardening mengikuti best practice implementasi saat ini (tidak terikat rules/skills lama yang akan di-reset).

## Edge Cases

- Dua request refresh bersamaan pada token yang sama.
- User suspended setelah akses token diterbitkan.
- Header forwarding palsu dari client langsung.
- Body JSON invalid atau schema mismatch.

## Acceptance Criteria

- Test concurrency refresh membuktikan satu token tidak bisa dipakai ulang.
- Semua endpoint private prioritas melewati authn/authz/ownership checks.
- Tidak ada response yang membocorkan field internal sensitif.
- Lint/check/test lulus setelah refactor milestone.
