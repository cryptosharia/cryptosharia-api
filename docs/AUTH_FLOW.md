# Authentication Flow

This document describes the complete authentication flow using **Access + Refresh Tokens** with rotation.

## SSO Architecture

All authentication UI lives on **accounts.cryptosharia.id**. Other platforms (Admin, Media, Academy, etc.) redirect there for signin.

```
User visits admin.cryptosharia.id
    │
    ▼
Has valid cookie? ──No──► Redirect to accounts.cryptosharia.id/signin?redirect=admin...
    │
   Yes
    │
    ▼
Has role_id? ──No──► Redirect to www.cryptosharia.id
    │
   Yes
    │
    ▼
✅ Access granted
```

**Cookie shared across all subdomains:** `domain=.cryptosharia.id`

---

## Token Overview

| Token             | Type          | Lifespan   | Storage                       | Purpose                         |
| ----------------- | ------------- | ---------- | ----------------------------- | ------------------------------- |
| **Access Token**  | JWT (ES256)   | 15 minutes | Browser cookie (`httpOnly`)   | Authorization for API requests  |
| **Refresh Token** | Random string | 7 days     | Browser cookie + API Database | Session continuity & revocation |

---

## 1. SIGNIN (on accounts.cryptosharia.id)

```
┌─────────┐          ┌────────────────┐          ┌─────────┐
│ Browser │          │ Accounts Server│          │   API   │
└────┬────┘          └───────┬────────┘          └────┬────┘
     │                       │                        │
     │ POST /signin          │                        │
     │ {email, password}     │                        │
     ├──────────────────────►│                        │
     │                     │                      │
     │                     │ POST /auth/signin    │
     │                     │ {email, password}    │
     │                     ├─────────────────────►│
     │                     │                      │
     │                     │                      │ 1. Verify credentials (Argon2)
     │                     │                      │ 2. Generate accessToken (JWT)
     │                     │                      │ 3. Generate refreshToken (random)
     │                     │                      │ 4. Save refreshToken to database
     │                     │                      │
     │                     │ {accessToken,        │
     │                     │  refreshToken,user}│
     │                     │◄─────────────────────┤
     │                     │                      │
     │                     │ Set httpOnly cookies │
     │                     │                      │
     │ Set-Cookie:         │                      │
     │ - accessToken       │                      │
     │ - refreshToken      │                      │
     │                     │                      │
     │ {user info}      │                      │
     │◄────────────────────┤                      │
```

### Database State After Signin

```sql
refresh_tokens:
| id     | user_id | token     | expires_at          | revoked_at |
|--------|------------|-----------|---------------------|------------|
| uuid-1 | user-1     | abc123... | 2026-02-14 14:00:00 | NULL       |
```

---

## 2. DOING THINGS but the Access Token still Valid

```
┌─────────┐          ┌────────────┐          ┌─────────┐
│ Browser │          │ App Server │          │   API   │
└────┬────┘          └─────┬──────┘          └────┬────┘
     │                     │                      │
     │ POST /posts         │                      │
     │ Cookie: accessToken │                      │
     ├────────────────────►│                      │
     │                     │                      │
     │                     │ POST /posts          │
     │                     │ Authorization: Bearer│
     │                     ├─────────────────────►│
     │                     │                      │
     │                     │                      │ 1. Verify JWT signature
     │                     │                      │ 2. Check not expired
     │                     │                      │ 3. Extract userId, roleId
     │                     │                      │ 4. Check permissions
     │                     │                      │ 5. Execute request
     │                     │                      │
     │                     │                      │ ⚡ NO DATABASE HIT (stateless)
     │                     │                      │
     │                     │ {data}               │
     │                     │◄─────────────────────┤
     │                     │                      │
     │ {data}              │                      │
     │◄────────────────────┤                      │
```

---

## 3. DOING THINGS but the Access Token Expired

When the access token expires, the App Server automatically refreshes.

```
┌─────────┐          ┌────────────┐          ┌─────────┐
│ Browser │          │ App Server │          │   API   │
└────┬────┘          └─────┬──────┘          └────┬────┘
     │                     │                      │
     │ POST /posts         │                      │
     │ Cookie: accessToken │                      │
     │        (EXPIRED)    │                      │
     ├────────────────────►│                      │
     │                     │                      │
     │                     │ POST /posts          │
     │                     ├─────────────────────►│
     │                     │                      │
     │                     │ 401 Unauthorized     │
     │                     │◄─────────────────────┤
     │                     │                      │
     │                     │ ─── AUTO REFRESH ────│
     │                     │                      │
     │                     │ POST /auth/refresh   │
     │                     │ {refreshToken}       │
     │                     ├─────────────────────►│
     │                     │                      │
     │                     │                      │ 1. Find refresh token in database
     │                     │                      │ 2. Check not expired
     │                     │                      │ 3. Check not revoked
     │                     │                      │ 4. REVOKE old token
     │                     │                      │ 5. Generate new tokens (refresh & access)
     │                     │                      │ 6. Save new refreshToken
     │                     │                      │
     │                     │ {newAccessToken,     │
     │                     │  newRefreshToken}    │
     │                     │◄─────────────────────┤
     │                     │                      │
     │                     │ ─── RETRY REQUEST ───│
     │                     │                      │
     │                     │ POST /posts          │
     │                     │ Authorization: Bearer│
     │                     │ {newAccessToken}     │
     │                     ├─────────────────────►│
     │                     │                      │
     │                     │ {data}               │
     │                     │◄─────────────────────┤
     │                     │                      │
     │ Set-Cookie (new)    │                      │
     │ {data}              │                      │
     │◄────────────────────┤                      │
```

### Database State After Refresh (Token Rotation)

```sql
refresh_tokens:
| id     | user_id | token     | expires_at          | revoked_at          |
|--------|------------|-----------|---------------------|---------------------|
| uuid-1 | user-1     | abc123... | 2026-02-14 14:00:00 | 2026-02-07 14:45:00 | ← REVOKED
| uuid-2 | user-1     | xyz789... | 2026-02-14 14:45:00 | NULL                | ← ACTIVE
```

---

## 4. SIGNOUT

```
┌─────────┐          ┌────────────┐          ┌─────────┐
│ Browser │          │ App Server │          │   API   │
└────┬────┘          └─────┬──────┘          └────┬────┘
     │                     │                      │
     │ POST /signout       │                      │
     │ Cookie: refreshToken│                      │
     ├────────────────────►│                      │
     │                     │                      │
     │                     │ POST /auth/signout   │
     │                     │ {refreshToken}       │
     │                     ├─────────────────────►│
     │                     │                      │
     │                     │                      │ 1. Find token in DB
     │                     │                      │ 2. Set revoked_at = NOW
     │                     │                      │
     │                     │ {success: true}      │
     │                     │◄─────────────────────┤
     │                     │                      │
     │ Clear-Cookie        │                      │
     │ {success: true}     │                      │
     │◄────────────────────┤                      │
```

---

## 5. THEFT DETECTION (Why Token Rotation Matters)

```
Timeline:
──────────────────────────────────────────────────────────────────────►

T1: User logs in
    → Receives refreshToken "abc123"
    → Stored in browser cookie + DB

T2: Attacker steals "abc123"
    (via physical access, XSS, malware, etc.)
    → Both User and Attacker have "abc123"

T3: User's browser refreshes (access token expired)
    → "abc123" is REVOKED in DB
    → User receives new token "xyz789"

T4: Attacker tries to use "abc123"
    → API checks DB: "abc123" is revoked
    → DENIED
    → Log: "Revoked token usage attempt for user-1"
    → Optional: Force password reset, notify user
```

Without rotation, both User and Attacker could use "abc123" forever until expiration.

---

## API Endpoints Summary

| Endpoint        | Method | Auth Required                      | Description                     |
| --------------- | ------ | ---------------------------------- | ------------------------------- |
| `/auth/signin`  | POST   | No                                 | Authenticate and receive tokens |
| `/auth/signout` | POST   | Yes (refresh token)                | Revoke refresh token            |
| `/auth/refresh` | POST   | No (but needs valid refresh token) | Get new token pair              |
| `/auth/me`      | GET    | Yes (access token)                 | Get current user info           |

---

## Cookie Configuration

```typescript
// Access Token Cookie
{
  name: 'access_token',
  value: '<jwt>',
  httpOnly: true,
  secure: true,        // HTTPS only
  sameSite: 'strict',  // CSRF protection
  path: '/',
  maxAge: 60 * 15      // 15 minutes
}

// Refresh Token Cookie
{
  name: 'refresh_token',
  value: '<random-string>',
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/',
  maxAge: 60 * 60 * 24 * 7  // 7 days
}
```

---

## Security Considerations

1. **httpOnly cookies**: JavaScript cannot access tokens (XSS protection)
2. **secure flag**: Tokens only sent over HTTPS
3. **sameSite=strict**: CSRF protection
4. **Token rotation**: Limits damage from stolen refresh tokens
5. **Short access token lifespan**: Reduces window of opportunity for stolen access tokens
6. **Database revocation**: Immediate invalidation of refresh tokens when needed

---

## Database Schema

```typescript
export const refreshTokens = pgTable('refresh_tokens', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id')
		.references(() => users.id, { onDelete: 'cascade' })
		.notNull(),
	token: varchar('token', { length: 64 }).notNull().unique(),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	revokedAt: timestamp('revoked_at', { withTimezone: true }) // NULL = active
});
```
