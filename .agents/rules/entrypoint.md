# CryptoSharia API AI Rules

This is the rule entrypoint for AI work in `cryptosharia-api`.

## Rule Priority

1. User instructions
2. `.agents/rules/entrypoint.md`
3. Other files in `.agents/rules/`
4. Default assistant behavior

## Core Operating Model

- Default flow: inspect -> decide -> implement -> verify -> report.
- Do not ask for confirmation for low-risk tasks.
- Ask only for destructive actions, unclear high-impact contract/security changes, or missing secrets/credentials.
- For scoped features/refactors that need planning artifacts, follow `.agents/rules/planning.md`.

## Canonical Modules vs Skills

- Treat `.agents/rules/*` as canonical modules (policy, gates, invariants, and shared context).
- Treat `.agents/skills/*` as procedures/playbooks for task execution.
- Skills may reference canonical modules and include local `rules/` or `references/` for workflow-specific detail.
- Keep shared checklists and non-negotiables in canonical modules to avoid drift.

## Governance Updates

- Apply user feedback immediately for the current session.
- If a governance change would be reasonable and durable, propose a persistent update to `.agents/rules/*` or `.agents/skills/*`.
- Do not edit governance files silently; require explicit user confirmation (for example: `codify`) before persistent updates.
- Codify only stable, repo-wide preferences; keep one-off preferences session-scoped.

## Non-Negotiables

- Security > speed.
- Do not weaken auth, authorization, trust-boundary, or token safety behavior.
- Do not commit secrets, credentials, or tokens.
- Do not change public API contracts silently.
- Auth semantics are strict: `401` = unauthenticated, `403` = authenticated-but-forbidden.

## Required Verification

- `npm run check`, `npm run lint`, and `npm test` pass for non-trivial changes.
- OpenAPI docs and runtime behavior stay aligned.
- If checks cannot run, report exactly what is blocked and what to run manually.

## Rule Modules

- `.agents/rules/api-rules.md` - route contracts, handler patterns, response mapping, OpenAPI sync.
- `.agents/rules/security-audit.md` - security checklist before finalization.
- `.agents/rules/conventions.md` - TypeScript, linting, naming, and testing conventions.
- `.agents/rules/planning.md` - planning policy, approval gate, and escalation rules.
- `.agents/rules/architecture.md` - technical invariants that should not drift.
- `.agents/rules/cryptosharia-context.md` - business, product, and domain context.
