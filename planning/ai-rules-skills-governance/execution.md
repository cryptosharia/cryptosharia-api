# Execution: ai-rules-skills-governance

## Context

Implementation must follow `planning/ai-rules-skills-governance/spec.md`.

## Execution Order

1. Normalize global rules in `.agents/rules/` as canonical policy modules.
2. Refactor `SKILL.md` files to focus on execution workflows.
3. Add skill-local `rules/` and `references/` only where needed.
4. Update skills index and top-level onboarding docs (`AGENTS.md`) with taxonomy clarity.
5. Run verification commands and finalize report.

## Allowed Files

- `.agents/rules/*.md`
- `.agents/skills/README.md`
- `.agents/skills/**/SKILL.md`
- `.agents/skills/**/rules/*.md`
- `.agents/skills/**/references/*.md`
- `AGENTS.md`
- `planning/ai-rules-skills-governance/*.md`

## Constraints

- Keep shared policy in `.agents/rules/*` (single source of truth).
- Do not duplicate full global checklists inside multiple skills.
- Do not change runtime application code under `src/**` in this task.
- Preserve planning and business-context capabilities.

## Escalation

- A global policy change is needed that affects auth/security semantics.
- Required edits fall outside allowed files.
- More than 2 failed attempts on the same blocker.

## Done Definition

- Acceptance criteria in `spec.md` are satisfied.
- Verification commands pass.
- Final diff is limited to allowed files (or deviations are documented).

## Final Report Format

- Files changed
- Rule/skill structure summary
- Verification results
- Deviations from spec (if any)
