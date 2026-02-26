# Route Flow Constraints

Use these constraints for route-level execution details that are specific to this skill.

## Handler Shape

- Keep route flow explicit: auth gate -> parse/validate -> orchestration -> response.
- Avoid hidden control flow branches that skip validation or permission checks.
- Keep status semantics intentional (`401` for unauthenticated, `403` for forbidden).

## Contract and Naming Discipline

- Keep route contracts in module `index.ts` and import them in `+server.ts`.
- Prefer named schemas/types that map to endpoint actions (for example `UsersGetQuery`).
- Reuse exported schemas in tests to avoid contract drift.

## Orchestration Boundaries

- Keep meaningful orchestration in routes; extract repeated logic to services.
- If orchestration is reused across endpoints, move it to `$lib/services/*`.
- Do not spread raw payloads into writes; keep field picking explicit in route or service.

## Test Minimum

- For changed endpoint behavior, include one success path and one negative path.
- For auth-sensitive changes, include explicit checks for `401` and `403` where applicable.
