---
name: cryptosharia-security-audit
description: Run CryptoSharia API security and contract checks before finalizing changes
---

# CryptoSharia Security Audit

## When to use

Use this skill before finalizing work that touches auth, user data, DB writes, caching, or API responses.

## Source of truth

Use `.agents/rules/security-audit.md` as the authoritative checklist.

## Execution workflow

1. Review changed files first
   - Focus on routes, auth middleware, DB write paths, and response mappers

2. Run the security checklist from `.agents/rules/security-audit.md`
   - Record concrete findings with file paths and risk level

3. Verify implementation gates
   - `npm run check`
   - `npm run lint`
   - `npm test`

4. Report
   - List issues found (or state "no issues found")
   - Include required fixes and why they matter
   - Confirm final status after fixes
