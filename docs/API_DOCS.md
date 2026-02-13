# CryptoSharia API Docs

This document serves as the **Single Source of Truth** for all endpoints, architectural rules, and security guidelines for the CryptoSharia API project.

---

## 🏛️ Architectural Pillars

### 1. Identification Layering (Strict Separation)

- **Internal Layer (Database, Logic, JWTs)**: Always use **UUIDs** (primary keys).
- **External Layer (Public Discovery)**: Use **Slugs** (posts, tokens), **Tickers** (tokens), or **Usernames** (future).
- **Rule of Thumb**:
  - **GET (Public)**: Use labels (Slugs/Tickers).
  - **PATCH, PUT, DELETE (Management)**: Use **UUIDs** to ensure stability even if labels change.
  - **Users**: Admin actions ALWAYS use UUIDs to avoid PII (Email) leakage.

### 2. API Response Standard

- All responses are wrapped in a standardized object:
  ```json
  {
    "status": "success | error",
    "message": "Human-readable message",
    "data": { ... }
  }
  ```
- **Safety**: Every response is filtered through a **Zod Schema** to prevent internal field leakage (hashes, raw IDs).

### 3. Identity Model (Unified User)

- **Single Source of Truth**: Everyone lives in the `users` table.
- **Roles**:
  - `role_id = NULL`: Regular member (Community, Store, Academy).
  - `role_id = "admin" | "posts_manager" | ...`: Staff with elevated dashboard access.

---

## 🛡️ Security & Authentication

### 1. Unified Identity (BFF Pattern)

- Authentication UI lives exclusively on **accounts.cryptosharia.id**.
- Communication between platforms and API is secure (httpOnly, sameSite=strict, domain-scoped cookies).

### 2. Access Control (RBAC)

- **Permissions** are required for all staff/admin actions.
- **Regular Users** are verified via authentication + ownership checks (e.g., updating their own profile).

### 3. Mandatory Headers

- `Api-Key`: Required for 1st-party platform identification.
- `Authorization: Bearer <token>`: Required for user authentication.

---

## 🚀 API Modules & Endpoints

### 🔐 Authentication (`/auth`)

| Method | Path            | Summary       | Rules                                                  |
| :----- | :-------------- | :------------ | :----------------------------------------------------- |
| `POST` | `/auth/signup`  | Sign Up       | Sets role to `member`; requires email verification.    |
| `POST` | `/auth/verify`  | Verify Email  | Uses secret token to activate account.                 |
| `POST` | `/auth/signin`  | Sign In       | Returns Access/Refresh tokens. Min password: 12 chars. |
| `POST` | `/auth/refresh` | Refresh Token | Rotates tokens; sliding session management.            |
| `POST` | `/auth/signout` | Sign Out      | Revokes the current refresh token.                     |
| `GET`  | `/auth/me`      | Get Profile   | Returns current user info + roles + permissions.       |

### 👤 Users (`/users`)

| Method  | Path                 | Summary        | Rules                                                       |
| :------ | :------------------- | :------------- | :---------------------------------------------------------- |
| `GET`   | `/users`             | List Users     | Admins only keywords. Filter by `role`, `status`, `search`. |
| `GET`   | `/users/{id}`        | Get Detail     | Requires `users.read` or **Ownership**.                     |
| `PATCH` | `/users/{id}`        | Update Profile | Requires `users.update` or **Ownership**.                   |
| `PUT`   | `/users/{id}/status` | Update Status  | Requires `users.manage_status`. Self-mod forbidden.         |
| `PUT`   | `/users/{id}/role`   | Assign Role    | Requires `users.manage_role`. Admins only.                  |

### 📝 Posts (`/posts`)

| Method | Path            | Summary     | Rules                                                  |
| :----- | :-------------- | :---------- | :----------------------------------------------------- |
| `GET`  | `/posts`        | List Posts  | Public (Published default). Auth users can see drafts. |
| `GET`  | `/posts/{slug}` | Get by Slug | **Public Endpoint**. Human-readable discovery.         |
| `GET`  | `/posts/{id}`   | Get by ID   | **Admin Endpoint**. Stable lookup for editors.         |

### 💎 Tokens (`/tokens`)

| Method | Path             | Summary     | Rules                                             |
| :----- | :--------------- | :---------- | :------------------------------------------------ |
| `GET`  | `/tokens`        | List Tokens | Filter by `shariaStatus`, `search`, `status`.     |
| `GET`  | `/tokens/{slug}` | Get by Slug | **Public Endpoint**. Human-readable discovery.    |
| `GET`  | `/tokens/{id}`   | Get by ID   | **Admin Endpoint**. Stable lookup for management. |
| `GET`  | `/tokens/quotes` | Get Quotes  | Real-time market data (via CoinMarketCap).        |

### 💬 Messages (`/messages`)

| Method | Path        | Summary       | Rules                                             |
| :----- | :---------- | :------------ | :------------------------------------------------ |
| `GET`  | `/messages` | List Messages | Admins only. Requires `messages.read`.            |
| `POST` | `/messages` | Send Message  | Public. Triggers **Email Notification** to admin. |

---

## 📧 Email Service

The API uses a **Consolidated Email Proxy** (Google Apps Script) for all internal and outbound communications.

- **URL**: Configured via `GAS_URL`.
- **Formatting**: The API handles all HTML formatting and **Strict Escaping** of user contents to prevent injection.
- **Background Tasks**: All email sending operations are handled via `@vercel/functions` `waitUntil` to ensure zero impact on API response latency.

---

## ⚙️ Configuration (.env)

| Key                    | Description                                        |
| :--------------------- | :------------------------------------------------- |
| `DATABASE_URL`         | PostgreSQL connection string.                      |
| `ACCESS_TOKEN_SECRET`  | 64-character hex secret for JWT Access Tokens.     |
| `REFRESH_TOKEN_SECRET` | 64-character hex secret for JWT Refresh Tokens.    |
| `GAS_URL`              | The Web App URL of your Google Apps Script proxy.  |
| `CMC_API_KEY`          | CoinMarketCap API Key for price quotes.            |
| `IMGBB_API_KEY`        | ImgBB API Key for asset storage proxy.             |
| `CS_API_KEY_*`         | Platform-specific API keys for BFF identification. |

### 🖼️ Assets & Storage

| Method | Path     | Summary      | Rules                                                  |
| :----- | :------- | :----------- | :----------------------------------------------------- |
| `POST` | `/imgbb` | Upload Image | Proxied to ImgBB. Returns standardized asset metadata. |

---

## 📈 Development Standards

### 1. Naming Convention

- **Schemas**: `[Resource][Action][Type]` (e.g., `UsersIdRolePutBody`).
- **Endpoints**: Plural and product-centric (e.g., `/tokens/quotes`, not `/getQuotes`).

### 2. Testing Protocol

- Every endpoint **MUST** have an integration test (`.test.ts`).
- Tests run against a dedicated `local_test` database.
- Use `createApiTestClient()` and `signTestUserIn()` for authenticated scenarios.

---

_Updated: 2026-02-13_
