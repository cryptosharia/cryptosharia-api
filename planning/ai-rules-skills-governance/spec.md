# Spec: ai-rules-skills-governance

## Goal

Create a maintainable AI governance model where global constraints are centralized and skills are execution-oriented, reducing duplication and long-term drift.

## Non-Goals

- Changing API contracts or route behavior.
- Introducing new runtime dependencies.
- Rewriting unrelated project documentation.

## Contracts

### Input

- Existing rule files under `.agents/rules/`.
- Existing skill files under `.agents/skills/`.
- Current project conventions and planning workflow.

### Output

- Global rule modules remain in `.agents/rules/` for shared policy.
- Skills under `.agents/skills/<skill>/` contain:
  - required `SKILL.md`
  - optional `rules/*.md`
  - optional `references/*.md`
- `SKILL.md` documents workflow and references relevant global rule modules.
- `AGENTS.md` explains the taxonomy: `.agents/rules/` as canonical modules and `.agents/skills/` as procedures/playbooks.

### Validation Rules

- Shared non-negotiables (security/auth/trust-boundary/planning gates) are defined once in global rules.
- Skills do not duplicate full global checklists verbatim.
- Every skill has clear `when to use`, `workflow`, and `done definition` sections.
- Cross-file references point to existing files only.
- Top-level project onboarding docs (`AGENTS.md`) stay aligned with the taxonomy defined in `entrypoint.md`.

## Behavior Rules

- Global rule updates propagate to all skills via references (single source of truth).
- Skill-local rules are used only for workflow-specific constraints.
- Skill-local references are used for examples/templates, not canonical policy.
- Entry point stays concise and maps to focused module files.

## Edge Cases

- If a skill does not need local `rules/` or `references/`, `SKILL.md` alone is valid.
- If a global policy change is required by one skill and also applies elsewhere, update global rules instead of local copies.

## Acceptance Criteria

- Rule-vs-skill responsibility is explicit and consistently applied.
- Skills are operationally usable without policy duplication.
- No broken references in `.agents/rules/` and `.agents/skills/`.
- Skills index reflects actual skills and intended usage flow.
- `AGENTS.md` communicates the same governance model as `.agents/rules/entrypoint.md`.
