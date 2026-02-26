---
name: cryptosharia-security-audit
description: Run CryptoSharia API security and contract checks before finalizing changes
---

# CryptoSharia Security Audit

## When to use

Use this skill before finalizing work that touches auth, user data, DB writes, caching, or API responses.

## Source of truth

- `.agents/rules/security-audit.md`
- `.agents/rules/entrypoint.md`
- `.agents/rules/architecture.md`

## Local supplements

- `rules/severity-model.md`
- `references/audit-report-template.md`

## Execution workflow

1. Review changed files first
   - Focus on routes, auth middleware, DB write paths, and response mappers

2. Run the security checklist
   - Record concrete findings with file paths and risk level

3. Fix findings before final verification
   - Prioritize auth bypass, trust-boundary, data exposure, and replay risks
   - Re-check any changed files after fixes

4. Verify implementation gates
   - `npm run check`
   - `npm run lint`
   - `npm test`

5. Report
   - Findings: `<none>` or list with `path`, `risk`, `fix`
   - Residual risk: explicit statement if anything is deferred
   - Final gate status (`check/lint/test`)

## Done definition

- Findings are triaged using the local severity model
- `critical` and `high` findings are resolved
- Final report follows the audit report template
