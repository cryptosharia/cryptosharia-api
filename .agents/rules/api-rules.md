# API Implementation Rules

Use this file for API/backend implementation specifics. Collaboration and process rules live in `.agents/rules/entrypoint.md`.

## API Response Standards

- **Schema-Driven Mapping**: Always use Zod schemas to map API responses (whitelist approach).
- **Metadata Expansion**: Use centralized helpers like `toAssetMetadata()` for relations.
- **Centralized Definitions**: API schemas and OpenAPI `RouteConfig` objects in module root `index.ts`.

## E2E Testing

- Run tests with `npm test` (executes `scripts/test-e2e.sh`)
- Tests use real HTTP against a dedicated `local_test` database

## Quality Gates

- Run the checklist in `.agents/rules/security-audit.md` before committing or merging changes.
- Keep `npm run lint` and `npm run check` passing.
