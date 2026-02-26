# API Implementation Rules

Use these rules when changing `src/routes/**` or API-facing services.

## 1) Contract First

- Define or update `RouteConfig` and Zod schemas in module `index.ts` before editing `+server.ts`.
- Export request/response/query/params schemas from `index.ts` and reuse them in handlers and tests.
- If adding a new route module, register it in `src/routes/openapi.json/registry.ts`.

## 2) Handler Structure

- Keep handlers readable and explicit: auth gate -> parse/validate -> domain orchestration -> response.
- Use shared helpers (`parseJsonBody`, `parseQueryParams`, `ApiResponse`).
- Keep meaningful orchestration in route handlers; extract repeated or complex logic into services.
- Enforce auth semantics consistently: `401` for unauthenticated, `403` for forbidden.

## 3) Input and Write Safety

- Treat request payloads as untrusted (`unknown` + schema validation).
- Never spread raw request payload directly into DB writes.
- Explicitly pick allowed fields for create and update operations.
- Keep ownership and permission checks explicit in the handler or service boundary.

## 4) Response Discipline

- Return responses through `ApiResponse` helpers.
- Map outgoing data via Zod parse/whitelist (do not pass through raw DB records blindly).
- Include related metadata via shared mappers (for example `toAssetMetadata`).
- Avoid leaking internal errors or upstream raw error bodies.

## 5) Tests and Verification

- Update integration tests whenever behavior, status codes, or contracts change.
- Add at least one negative-path test for auth/validation/security-sensitive changes.
- Keep OpenAPI responses synchronized with runtime behavior and messages.
- Run `npm run check`, `npm run lint`, and `npm test`.
