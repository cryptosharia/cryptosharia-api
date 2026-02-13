# Admin Implementation Plan (DRAFT)

This plan outlines the implementation of comprehensive admin functionality for the CryptoSharia API, enabling the **CryptoSharia Admin** platform to manage the entire ecosystem.

## User Review Required

> [!IMPORTANT]
> **Authentication Strategy**: This plan proposes implementing **JWT-based authentication** for admin sessions alongside the existing API Key authentication. API Keys will continue to be used for server-to-server communication (SvelteKit apps → API), while JWT tokens will be used for admin user sessions.

> [!IMPORTANT]
> **Breaking Changes**: The `hooks.server.ts` will be modified to support dual authentication modes. This should not affect existing API Key consumers, but needs careful testing.

> [!WARNING]
> **Security Consideration**: Admin endpoints will require both valid JWT tokens AND appropriate permissions. The first admin user will need to be seeded manually or through a special bootstrap endpoint.

> [!IMPORTANT]
> **Admin MFA & Safety**: MFA is **mandatory** for any account with a `role_id` (staff/admin). We will also implement a **Sudo Mode** (re-verification) for destructive or high-stakes administrative actions.

> [!NOTE]
> **Identity Model**: We are following a **Shared Identity Model** using a single `users` table for both regular users and staff. This simplifies SSO across the CryptoSharia ecosystem while providing consistent security through strict role-based access control and hardening layers.

---

## Implementation Progress

### ✅ Completed

- [x] Token utilities (`src/lib/auth/tokens.ts`) - HS256 for Access Tokens, Opaque Strings for Refresh Tokens
- [x] Password utilities (`src/lib/auth/password.ts`) - Argon2id hashing
- [x] Database schema updates (users table, refreshTokens table)
- [x] Identification Layering (UUID internal, Slug external)
- [x] Role-Based Access Control (RBAC) System
- [x] API Response Standardization (Zod parsing, Metadata expansion)
- [x] Auth Endpoints:
  - [x] `/auth/signin`
  - [x] `/auth/signup`
  - [x] `/auth/verify`
  - [x] `/auth/signout`
  - [x] `/auth/refresh`
  - [x] `/auth/me`
- [x] User Management Endpoints:
  - [x] `GET /users` - List users (Admin)
  - [x] `GET /users/:id` - Get user detail (Admin/Self)
  - [x] `PATCH /users/:id` - Update profile (Admin/Self)
  - [x] `PUT /users/:id/status` - Update status (Admin)
  - [x] `PUT /users/:id/role` - Assign role (Admin)

### 📋 Todo - Core Modules

- [ ] Assets Management Endpoint (`/assets`) - Integrated storage management
- [ ] Role Management Endpoints (`/roles`)
- [ ] Permission Discovery Endpoints (`/permissions`)
- [ ] Activity Logging Implementation

---

## Proposed Changes

### Authentication & Security

#### [NEW] [tokens.ts](src/lib/auth/tokens.ts)

JWT utility functions for token generation, verification, and refresh logic:

- `signAccessToken(userId: string, role: string)` - Generate short-lived access token (15 minutes)
- `generateRandomToken()` - Generate cryptographically secure random string for refresh tokens
- `verifyAccessToken(token: string)` - Verify and decode access token
- Uses `jose` library with HS256 algorithm (symmetric keys)

#### [NEW] [auth-middleware.ts](src/lib/auth-middleware.ts)

Middleware utilities for route protection:

- `requireAuth()` - Verify JWT token from Authorization header
- `requirePermission(permissionKey: string)` - Check if admin has specific permission
- `requireRole(roleSlug: string)` - Check if admin has specific role
- Extracts admin context and attaches to `event.locals`

#### [NEW] [activity-logger.ts](src/lib/activity-logger.ts)

Activity logging utilities:

- `logActivity(userId, action, subjectType, subjectId, description, ipAddress)` - Log user actions
- Automatic logging wrapper for CRUD operations
- IP address extraction from request headers

#### [MODIFY] [hooks.server.ts](src/hooks.server.ts)

Update to support dual authentication:

- Keep existing API Key authentication for public/server-to-server endpoints
- Add JWT authentication check for `/auth/*` and `/admin/*` routes
- Exempt `/auth/signin` from authentication
- Attach user context to `event.locals.user` when JWT is valid

#### [MODIFY] [app.d.ts](src/app.d.ts)

Add type definitions for locals:

```typescript
interface Locals {
	user?: {
		id: string;
		email: string;
		role: string | null;
		permissions: string[];
	};
}
```

---

### Authentication Endpoints

#### [NEW] [/auth/signin/+server.ts](src/routes/auth/signin/+server.ts)

Admin signin endpoint:

- **POST** `/auth/signin`
- Request body: `{ email: string, password: string, twoFactorCode?: string }`
- Validates credentials using Argon2 password verification
- Checks if admin is active
- Verifies 2FA code if enabled
- Returns access token, refresh token, and user info
- Logs successful signin with IP address

#### [NEW] [/auth/signin/index.ts](src/routes/auth/signin/index.ts)

OpenAPI specification for signin endpoint.

#### [NEW] [/auth/signout/+server.ts](src/routes/auth/signout/+server.ts)

Admin signout endpoint:

- **POST** `/auth/signout`
- Requires valid JWT token
- Optional: Add token to blacklist (Redis)
- Logs signout activity

#### [NEW] [/auth/refresh/+server.ts](src/routes/auth/refresh/+server.ts)

Token refresh endpoint:

- **POST** `/auth/refresh`
- Request body: `{ refreshToken: string }`
- Validates refresh token
- Issues new access token and refresh token
- Rotates refresh tokens for security

#### [NEW] [/auth/me/+server.ts](src/routes/auth/me/+server.ts)

Get current admin info:

- **GET** `/auth/me`
- Requires valid JWT token
- Returns user profile with role and permissions

---

### User Management Endpoints

#### [NEW] [/users/+server.ts](src/routes/users/+server.ts)

List and create users:

- **GET** `/users` - List all users with pagination, search, and role filtering
  - Query params: `search`, `role`, `isActive`, `limit`, `page`
  - Requires permission: `users.read`
- **POST** `/users` - Create new user
  - Request body: `{ name, email, password, role?, avatarUrl? }`
  - Requires permission: `users.create`
  - Hashes password with Argon2
  - Logs creation activity

#### [NEW] [/users/index.ts](src/routes/users/index.ts)

OpenAPI specifications for user list and create endpoints.

#### [NEW] [/users/[id]/+server.ts](src/routes/users/[id]/+server.ts)

Get, update, and delete specific user:

- **GET** `/users/:id` - Get user by ID
  - Requires permission: `users.read`
- **PATCH** `/users/:id` - Update user generic fields
  - Request body: `{ name?, email?, bio?, isActive? }`
  - **CRITICAL**: Does NOT allow `role` or `password` updates
  - Requires permission: `users.update`
  - Logs update activity
- **PUT** `/users/:id/role` - Assign role
  - Request body: `{ role }`
  - Requires permission: `users.promote` (Higher privilege)
  - Logs role assignment activity
- **DELETE** `/users/:id` - Soft delete (set `isActive = false`)
  - Requires permission: `users.delete`
  - Prevents self-deletion
  - Logs deletion activity

#### [NEW] [/users/[id]/password/+server.ts](src/routes/users/[id]/password/+server.ts)

Change user password:

- **PATCH** `/users/:id/password`
- Request body: `{ currentPassword, newPassword }`
- Users can change their own password, or super admins can change any password
- Requires permission: `users.update` (for others) or self
- Validates password strength
- Logs password change activity

#### [NEW] [/users/[id]/avatar/+server.ts](src/routes/users/[id]/avatar/+server.ts)

Upload user avatar:

- **POST** `/users/:id/avatar`
- Accepts `multipart/form-data` with image file
- Uploads to configured storage provider (ImgBB or Vercel Blob)
- Updates user's `avatarUrl`
- Requires permission: `users.update` or self

---

### Role Management Endpoints

#### [NEW] [/roles/+server.ts](src/routes/roles/+server.ts)

List and create roles:

- **GET** `/roles` - List all roles with their permission counts
  - Query params: `search`, `limit`, `page`
  - Requires permission: `roles.read`
- **POST** `/roles` - Create new role
  - Request body: `{ name, slug }`
  - Requires permission: `roles.create`
  - Logs creation activity

#### [NEW] [/roles/[id]/+server.ts](src/routes/roles/[id]/+server.ts)

Get, update, and delete specific role:

- **GET** `/roles/:id` - Get role by ID with permissions
  - Requires permission: `roles.read`
- **PATCH** `/roles/:id` - Update role
  - Request body: `{ name?, slug? }`
  - Requires permission: `roles.update`
  - Logs update activity
- **DELETE** `/roles/:id` - Delete role
  - Requires permission: `roles.delete`
  - Prevents deletion if role is assigned to users
  - Logs deletion activity

#### [NEW] [/roles/[id]/permissions/+server.ts](src/routes/roles/[id]/permissions/+server.ts)

Manage role permissions:

- **PUT** `/roles/:id/permissions` - Replace all permissions for a role
  - Request body: `{ permissionIds: string[] }`
  - Requires permission: `roles.update`
  - Deletes existing role-permission mappings and creates new ones
  - Logs permission assignment activity

---

### Permission Endpoints (Read-Only)

Permissions are **static and code-defined**. They are seeded via migration and cannot be created/updated/deleted via API. Only listing is available.

#### [NEW] [/permissions/+server.ts](src/routes/permissions/+server.ts)

List permissions:

- **GET** `/permissions` - List all permissions grouped by module
  - Query params: `module`, `search`, `limit`, `page`
  - Requires permission: `permissions.read`

---

### Activity Logs Endpoints

#### [NEW] [/activity-logs/+server.ts](src/routes/activity-logs/+server.ts)

List activity logs:

- **GET** `/activity-logs` - List all activity logs with filtering
  - Query params: `userId`, `action`, `subjectType`, `startDate`, `endDate`, `limit`, `page`
  - Requires permission: `activity-logs.read`
  - Returns logs with user info joined

#### [NEW] [/activity-logs/[id]/+server.ts](src/routes/activity-logs/[id]/+server.ts)

Get specific activity log:

- **GET** `/activity-logs/:id` - Get activity log by ID
  - Requires permission: `activity-logs.read`

---

### Social Authentication (Phase 10)

#### [NEW] [oauth-handler.ts](src/lib/auth/oauth-handler.ts)

Utilities for OAuth providers (Google):

- `getGoogleAuthUrl()` - Generate redirect URL with state
- `validateGoogleCallback(code)` - Exchange code for tokens & profile

#### [NEW] [/auth/google/+server.ts](src/routes/auth/google/+server.ts)

Redirect to Google:

- **GET** `/auth/google`
- Redirects user to Google Identity platform

#### [NEW] [/auth/callback/google/+server.ts](src/routes/auth/callback/google/+server.ts)

Handle Google Callback:

- **GET** `/auth/callback/google`
- Validates `code` and `state`
- Check if user exists (by email) -> Link or Create
- **CRITICAL**: Checks for 2FA requirement
  - If 2FA enabled: Returns temporary session (or redirect) to 2FA verify page
  - If no 2FA: Issues standard JWT pair

---

### Security Hardening (Administrative)

#### [NEW] [sudo-middleware.ts](src/lib/auth/sudo-middleware.ts)

Middleware for re-verification:

- `requireSudo()` - Checks for a recent `sudo_confirmed_at` timestamp in the session.
- If expired, returns a `403 Forbidden` with a specialized code `NEEDS_SUDO_CONFIRMATION`.

#### [MODIFY] [/auth/2fa/verify/+server.ts](src/routes/auth/2fa/verify/+server.ts)

- Update logic to ensure `loa: 2` (Level of Assurance) is granted in the session upon successful MFA verification.
- Admin routes will check for `loa: 2`.
- **Note**: This verification is required regardless of whether the user signed in via Password or Google OAuth.

#### [NEW] [/auth/2fa/disable/+server.ts](src/routes/auth/2fa/disable/+server.ts)

Disable 2FA:

- **POST** `/auth/2fa/disable`
- Request body: `{ password, code }`
- Verifies password and current 2FA code
- Removes `twoFactorSecret` from user
- Logs 2FA disablement

---

### Database & Seeding

#### [NEW] [/seed/permissions/+server.ts](src/routes/seed/permissions/+server.ts)

Seed default permissions:

- Creates module-based permissions for all resources:
  - `users`: create, read, update, delete
  - `roles`: create, read, update, delete
  - `permissions`: read
  - `tokens`: create, read, update, delete
  - `posts`: create, read, update, delete
  - `tags`: create, read, update, delete
  - `messages`: read, delete
  - `assets`: create, read, delete
  - `activity-logs`: read

#### [NEW] [/seed/admin/+server.ts](src/routes/seed/admin/+server.ts)

Bootstrap first user:

- **POST** `/seed/user` (one-time use, disabled after first staff user exists)
- Creates "Super Admin" role with all permissions
- Creates first staff user with Super Admin role
- Request body: `{ name, email, password }`
- No authentication required (only works if no staff users exist)

---

### Database Schema Changes

#### [MODIFY] [db/tables.ts](src/lib/db/tables.ts)

**Rename `admins` table to `users`:**

```typescript
export const users = pgTable('users', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: varchar('name', { length: 100 }).notNull(),
	email: varchar('email', { length: 255 }).notNull().unique(),
	hashedPassword: text('hashed_password').notNull(),
	passwordHashingAlgorithm: varchar('password_hashing_algorithm', { length: 20 })
		.notNull()
		.default('argon2id'),
	role: uuid('role_id').references(() => roles.id), // NULL = regular user, set = staff/admin
	avatarUrl: text('avatar_url'),
	twoFactorSecret: text('two_factor_secret'),
	isActive: boolean('is_active').notNull().default(true),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});
```

**Add `refreshTokens` table for token management:**

```typescript
export const refreshTokens = pgTable('refresh_tokens', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id')
		.references(() => users.id, { onDelete: 'cascade' })
		.notNull(),
	token: varchar('token', { length: 64 }).notNull().unique(),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	revokedAt: timestamp('revoked_at', { withTimezone: true }) // Null = active
});

export const oauthAccounts = pgTable(
	'oauth_accounts',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.references(() => users.id, { onDelete: 'cascade' })
			.notNull(),
		provider: varchar('provider', { length: 50 }).notNull(), // 'google'
		providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => ({
		uniqueProviderAccount: unique().on(t.provider, t.providerAccountId)
	})
);
```

**Update all FK references:**

- `activityLogs.adminId` → `activityLogs.userId`
- `*.createdBy` → still references `users.id`
- `*.updatedBy` → still references `users.id`

**Purpose**:

- Unified `users` table for both regular users (role_id = NULL) and staff (role_id = role)
- `passwordHashingAlgorithm` enables algorithm agility for password security upgrades
- `refreshTokens` table stores refresh tokens for revocation capability

---

### Supporting Libraries & Types

#### [NEW] [password.ts](src/lib/password.ts)

Password utilities:

- `hashPassword(password: string)` - Hash password with Argon2, returns `{ hash, algorithm }`
- `verifyPassword(password: string, hash: string, algorithm: string)` - Verify password using specified algorithm
- `validatePasswordStrength(password: string)` - Validate minimum requirements (8+ chars, uppercase, lowercase, number, special char)
- `shouldRehash(algorithm: string)` - Check if password should be re-hashed with newer algorithm

#### [MODIFY] [api-types.ts](src/lib/api-types.ts)

Add Zod schemas and TypeScript types for:

- `SigninRequest`, `SigninResponse`
- `RefreshTokenRequest`, `RefreshTokenResponse`
- `CreateUserRequest`, `UpdateUserRequest`, `ChangePasswordRequest`
- `CreateRoleRequest`, `UpdateRoleRequest`, `AssignPermissionsRequest`
- `CreatePermissionRequest`, `UpdatePermissionRequest`
- `ActivityLogFilters`

#### [MODIFY] [db/types.ts](src/lib/db/types.ts)

Add Zod schemas for database models:

- `Admin` (with relations to role)
- `Role` (with relations to permissions)
- `Permission`
- `ActivityLog` (with relations to admin)
- `RefreshToken`

---

## Verification Plan

### Automated Tests

1. **Authentication Flow Tests** (`src/routes/auth/auth.test.ts`):
   - Signin with valid credentials
   - Signin with invalid credentials
   - Signin with 2FA enabled
   - Token refresh flow
   - Logout flow
   - Get current admin info

2. **Admin CRUD Tests** (`src/routes/admins/admins.test.ts`):
   - List admins with pagination
   - Create admin with valid data
   - Update admin information
   - Change password
   - Soft delete admin
   - Prevent self-deletion

3. **Role Management Tests** (`src/routes/roles/roles.test.ts`):
   - List roles
   - Create role
   - Update role
   - Delete role (should fail if assigned to admins)
   - Assign permissions to role

4. **Permission Tests** (`src/routes/permissions/permissions.test.ts`):
   - List permissions
   - Create permission
   - Update permission
   - Delete permission

5. **Authorization Tests** (`src/lib/auth-middleware.test.ts`):
   - Verify JWT token validation
   - Verify permission checking
   - Verify role checking
   - Verify unauthorized access is blocked

6. **Activity Logging Tests** (`src/lib/activity-logger.test.ts`):
   - Verify activities are logged correctly
   - Verify activity log retrieval with filters

### Manual Verification

1. **Integration Testing**:
   - Test complete admin workflow from CryptoSharia Admin platform
   - Verify JWT tokens are properly set in cookies/headers
   - Verify permission-based UI rendering

2. **Security Testing**:
   - Verify password hashing with Argon2
   - Verify JWT token expiration
   - Verify 2FA flow (if implemented)
   - Verify rate limiting on signin endpoint
   - Verify activity logs capture all admin actions

3. **Database Verification**:
   - Run seed scripts and verify default permissions
   - Verify first admin creation
   - Verify foreign key constraints
   - Verify cascade deletes work correctly

---

## Dependencies to Install

```bash
npm install jsonwebtoken argon2 speakeasy qrcode
npm install -D @types/jsonwebtoken @types/speakeasy @types/qrcode
```

---

## Environment Variables

Add to `.env`:

```bash
# JWT Configuration
JWT_ACCESS_SECRET=<generate-strong-secret>
JWT_REFRESH_SECRET=<generate-strong-secret>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Optional: Redis for token blacklist
REDIS_URL=redis://localhost:6379
```

---

## Migration Strategy

1. **Phase 1**: Implement authentication and middleware (no breaking changes)
2. **Phase 2**: Implement admin CRUD endpoints (test with existing data)
3. **Phase 3**: Implement role and permission management
4. **Phase 4**: Add activity logging to all endpoints
5. **Phase 5**: Add 2FA and advanced security features
6. **Phase 6**: Update existing endpoints to use new permission system

This phased approach allows incremental testing and reduces risk of breaking existing functionality.

---

## Open Questions / Discussion Points

1. **2FA Timing**: Should 2FA be implemented in Phase 1 or deferred to Phase 5?
2. **Token Storage**: Redis for token blacklist or in-memory for MVP?
3. **JWT Algorithm**: RS256 (asymmetric) or HS256 (symmetric)?
4. **Password Reset**: Should we include password reset flow in initial implementation?
5. **Rate Limiting**: Which endpoints need rate limiting? (signin, password change, etc.)
6. **Admin Routes Prefix**: Should admin endpoints be under `/admin/*` or keep flat structure?
