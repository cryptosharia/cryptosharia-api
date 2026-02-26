---
name: cryptosharia-db-change-implementation
description: Safely implement Drizzle schema and migration changes with explicit data safety checks
---

# CryptoSharia DB Change Implementation

## When to use

Use this skill when changing database schema, relations, enums, or data-access behavior.

## Source of truth

- `src/lib/db/tables.ts`
- `src/lib/db/schema/**`
- `.agents/rules/security-audit.md`
- `.agents/rules/planning.md` (for scoped/high-impact DB work)

## Local supplements

- `rules/migration-safety.md`
- `references/db-change-report-template.md`

## Workflow

1. Define change intent and safety constraints
   - What changes in schema and why
   - Backward compatibility and data migration implications

2. Update schema code explicitly
   - Apply changes in `src/lib/db/tables.ts`
   - Update exports/types/relations in `src/lib/db/schema/**` and related files

3. Produce migration artifacts
   - Generate migration: `npm run db:generate`
   - Apply migration (or push for local iteration) with project-approved workflow

4. Update API/service boundaries
   - Adapt affected routes/services/types/tests
   - Keep write safety explicit (no mass assignment)

5. Validate through tests and checks
   - `npm run check`
   - `npm run lint`
   - `npm test`

## Constraints

- Do not run destructive data operations without explicit user approval.
- Do not silently change external API contracts as a side-effect of DB changes.

## Done definition

- Schema and migration files are consistent
- Affected code paths and tests are updated
- Verification gates pass

## Final report format

- Schema/migration files changed
- Data-safety considerations
- API/test impact
- Check/test results
