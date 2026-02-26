# Architecture Invariants

These are stable architecture decisions for `cryptosharia-api`. Do not change them silently.

## 1) API-First Backbone

- `cryptosharia-api` is the central backend for first-party CryptoSharia platforms.
- Business rules and data contracts are defined here and consumed by other apps.

## 2) Tech Stack

- **Runtime**: Node.js with SvelteKit
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: JWT (access + refresh), RBAC with permissions
- **API**: REST with OpenAPI docs, Zod for validation
- **Rate Limiting**: Token bucket per IP (after API key validation)
- **File Storage**: ImgBB for image uploads

## 3) Content Model

- **Tokens**: Crypto assets with Sharia compliance rating (halal/haram/syubhat), rankings, TradingView symbols
- **Posts**: Articles, news, webinars, videos with sections (news/education/research/activity)
- **Tags**: Many-to-many tagging for posts and tokens
- **Messages**: Contact form entries
- **Assets**: File metadata for images/uploads

## 4) Security Boundary at Hooks

- `src/hooks.server.ts` is the trust boundary for request identity.
- `event.locals.clientIp` is the canonical client IP value.
- Forwarded header parsing is centralized in `src/lib/api/trust-boundary.ts`.

## 5) Auth Layering Model

- Non-public routes require valid `Api-Key` in hooks.
- JWT parsing is optional in hooks; route handlers decide whether authentication is required.
- Authorization is enforced by role/permission checks in route logic.
- Auth status semantics are strict: `401` unauthenticated, `403` forbidden.

## 6) Rate Limiting Model

- Rate limiting is applied to private routes only.
- Rate limiting occurs after API key validation.
- Limiter keying is based on trusted client IP from locals.

## 7) Contract-First Route Modules

- Route contracts live in module `index.ts` files (`RouteConfig` + Zod schemas).
- Handlers in `+server.ts` implement those contracts, not the other way around.
- OpenAPI output (`/openapi.json`) must reflect runtime behavior.

## 8) Session and Token Invariants

- Access tokens are short-lived JWTs.
- Refresh tokens are opaque DB-backed tokens.
- Refresh rotation uses one-time atomic consume/rotate to prevent replay.

## 9) Data and RBAC Model

- `users` is the unified identity table for staff and members.
- Roles are enum-backed (`super_admin`, `admin`, `posts_manager`, `tokens_manager`, `member`).
- User status lifecycle is enum-backed (`active`, `inactive`, `suspended`, `banned`).
- Permission checks use static RBAC mapping in `$lib/auth/rbac.ts`.
