# Plan: ai-rules-skills-governance

## Objective

Establish a durable AI governance structure where global rules live in `.agents/rules/` and skills remain task-focused playbooks with optional local `rules/` and `references/`.

## Scope

- Define and document clear responsibility boundaries between global rules and skill-local guidance.
- Standardize skill structure and minimum SKILL.md sections.
- Remove policy duplication across skills by referencing canonical rule modules.
- Add skill-local `rules/` or `references/` only where workflow-specific detail is needed.
- Update skills index to reflect the final structure and usage chains.
- Document the canonical-modules taxonomy in `AGENTS.md` as the human-facing entrypoint.

## Out of Scope

- Runtime API behavior changes in `src/**`.
- Database schema changes.
- Product feature implementation unrelated to AI governance docs.

## Architecture Decisions

- `.agents/rules/` is the single source of truth for cross-cutting policy (security, architecture invariants, planning workflow, coding conventions).
- `.agents/skills/<skill>/SKILL.md` defines execution workflow and references global rules.
- Skill-local `rules/` and `references/` are allowed for workflow-specific details, examples, and templates.
- Avoid full checklist duplication inside multiple skills to prevent drift.

## File Change Map

- `.agents/rules/entrypoint.md` - concise entrypoint and module map.
- `.agents/rules/*.md` - canonical global policy modules.
- `.agents/skills/README.md` - skill catalog and chain guidance.
- `.agents/skills/*/SKILL.md` - per-skill workflows with links to source-of-truth policies.
- `.agents/skills/*/rules/*.md` - optional skill-scoped constraints.
- `.agents/skills/*/references/*.md` - optional skill-scoped references/templates.
- `AGENTS.md` - top-level taxonomy explanation and navigation pointer.

## Risks and Mitigations

- Risk: Policy drift between rules and skills.
  Mitigation: Keep canonical checklists only in `.agents/rules/*`; skills reference them.
- Risk: Over-documentation creates noise.
  Mitigation: Keep entrypoint short; move details to focused modules.
- Risk: Broken links after restructuring.
  Mitigation: Run reference grep checks across `.agents/**` before finalization.

## Acceptance Criteria

- Rule/skill boundary is explicit and documented.
- All skills reference canonical global rules for shared policy.
- No orphan references to deleted or moved rule files.
- Skills index accurately lists available skills and recommended chains.
- Structure supports both execution tasks and business brainstorming.

## Verification

- `git diff -- .agents/rules .agents/skills AGENTS.md`
- `rg "\.agents/rules/" .agents/skills`
- `npm run check`
- `npm run lint`
- `npm test`
