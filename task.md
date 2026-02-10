# Admin Implementation Task List

## Phase 0: Database Schema Refactor

- [x] Rename `admins` table → `users` <!-- id: 84 -->
- [x] Update all FK references: `adminId` → `userId` <!-- id: 85 -->
- [x] Add `passwordHashingAlgorithm` field to `users` table <!-- id: 86 -->
- [x] Create `refreshTokens` table <!-- id: 87 -->
- [x] Run `db push` <!-- id: 88 -->

## Phase 1: Authentication & Session Management

- [x] Implement JWT-based authentication <!-- id: 89 -->
  - [x] Create `/auth/signin` endpoint (POST) <!-- id: 90 -->
  - [x] Create `/auth/signout` endpoint (POST) <!-- id: 91 -->
  - [x] Create `/auth/refresh` endpoint (POST) <!-- id: 92 -->
  - [x] Create `/auth/me` endpoint (GET) - get current user info <!-- id: 93 -->
- [x] Add JWT utilities (sign, verify, refresh) <!-- id: 94 -->
- [x] Update `src/hooks.server.ts` to support dual authentication (API Key + JWT) <!-- id: 95 -->
- [x] Add session management (refresh token rotation) <!-- id: 96 -->

## Phase 1.5: Testing Infrastructure

- [x] Migrate to Real HTTP Testing <!-- id: 97 -->
  - [x] Refactor `src/lib/test-utils.ts` <!-- id: 98 -->
  - [x] Update all `*.test.ts` to use real API calls <!-- id: 99 -->
- [x] Automation (Unified Command) <!-- id: 100 -->
  - [x] Implementation <!-- id: 79 -->
    - [x] Create `scripts/test-e2e.sh` <!-- id: 80 -->
    - [x] Update `package.json` with unified test command <!-- id: 81 -->
  - [x] Verification <!-- id: 82 -->
    - [x] Run `npm test` and verify full automation <!-- id: 83 -->
- [x] Refining Code Quality Tools <!-- id: 19 -->
  - [x] Ignore auto-generated types in Prettier <!-- id: 20 -->
  - [x] Ignore auto-generated types in ESLint <!-- id: 21 -->

## Phase 2: Authorization & Middleware

- [x] Create permission checking utilities (`src/lib/auth/permissions.ts`) <!-- id: 103 -->
- [x] Create role-based access control (RBAC) middleware <!-- id: 104 -->
- [x] Implement activity logging utility <!-- id: 106 -->
- [x] Standardize Identification Layering (UUID internal, Slug external) <!-- id: 106.1 -->
- [x] Refine `/auth/me` & `/auth/signin` for flat response structure <!-- id: 106.2 -->
- [x] Standardize API Response Messages (Phase 2.6) [x] <!-- id: 106.3 -->

## Phase 3: User CRUD Endpoints

- [/] `/users` - List users (GET) <!-- id: 107 -->
- [/] `/users/:id` - Get user by ID (GET) <!-- id: 108 -->
- [/] `/users` - Create user (POST) <!-- id: 109 -->
- [/] `/users/:id` - Update user (PATCH) <!-- id: 110 -->
- [/] `/users/:id` - Delete/deactivate user (DELETE) <!-- id: 111 -->
- [/] `/users/:id/password` - Change password (PATCH) <!-- id: 112 -->
- [ ] `/users/:id/avatar` - Upload avatar (POST) <!-- id: 113 -->

## Phase 4: Role Management Endpoints

- [ ] `/roles` - List roles (GET) <!-- id: 114 -->
- [ ] `/roles/:id` - Get role by ID (GET) <!-- id: 115 -->
- [ ] `/roles` - Create role (POST) <!-- id: 116 -->
- [ ] `/roles/:id` - Update role (PATCH) <!-- id: 117 -->
- [ ] `/roles/:id` - Delete role (DELETE) <!-- id: 118 -->
- [ ] `/roles/:id/permissions` - Assign permissions to role (PUT) <!-- id: 119 -->

## Phase 5: Permission Endpoints (Read-Only)

- [ ] `/permissions` - List permissions (GET) <!-- id: 120 -->

## Phase 6: Activity Logs

- [ ] `/activity-logs` - List activity logs (GET) <!-- id: 121 -->
- [ ] `/activity-logs/:id` - Get activity log by ID (GET) <!-- id: 122 -->
- [ ] Implement automatic activity logging for all user actions <!-- id: 123 -->

## Phase 7: Security Enhancements

- [ ] Implement 2FA (TOTP) endpoints <!-- id: 124 -->
- [ ] Add rate limiting for authentication endpoints <!-- id: 125 -->
- [ ] Add password strength validation <!-- id: 126 -->
- [ ] Add password reset flow (optional) <!-- id: 127 -->

## Phase 8: Testing & Documentation

- [ ] Write unit tests for authentication utilities <!-- id: 128 -->
- [ ] Write integration tests for all user endpoints <!-- id: 129 -->
- [ ] Update OpenAPI documentation <!-- id: 130 -->
- [ ] Create seed data for development <!-- id: 131 -->

## Phase 9: Database Seeding

- [ ] Create initial seed for permissions (module-based) <!-- id: 132 -->
- [ ] Create default "Super Admin" role with all permissions <!-- id: 133 -->
- [ ] Create first staff user for bootstrapping <!-- id: 134 -->
