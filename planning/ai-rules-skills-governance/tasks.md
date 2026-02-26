# Tasks: ai-rules-skills-governance

- [x] Create planning pack (`plan.md`, `spec.md`, `tasks.md`, `execution.md`)
- [x] Finalize global rule modules for canonical policy ownership
- [x] Restructure each skill to keep workflow local and policy references global
- [x] Add skill-local `rules/` and `references/` where workflow-specific depth is needed
- [x] Update `.agents/skills/README.md` with final structure and usage chains
- [x] Validate references and run verification commands
- [x] Align `AGENTS.md` taxonomy wording with `.agents/rules/entrypoint.md`
- [x] Slim `.agents/rules/planning.md` to policy-only and move templates into planning skill references
- [x] Add governance-update policy (friction -> proposal -> explicit codify) in entrypoint and AGENTS
- [x] Refined governance-update policy: change trigger is "reasonable/durable" not "repeated friction"
- [x] Remove dynamic data from cryptosharia-context.md and move technical content to architecture.md

## Definition of Done

- [x] Acceptance criteria in `spec.md` satisfied
- [x] Rule-vs-skill boundaries are consistently applied
- [x] Verification commands pass
- [x] Deviations documented
- [x] Top-level onboarding docs align with rule/skill taxonomy

## Execution Log

- 2026-02-25: Planning pack created after agreeing on global-rules + skill-playbook model.
- 2026-02-25: Restored modular global rule set (`entrypoint`, `api-rules`, `security-audit`, `architecture`) and expanded business context.
- 2026-02-25: Added skill-local `rules/` and `references/` across skill folders for workflow-specific constraints/templates.
- 2026-02-25: Updated SKILL.md files to reference global policy modules and local supplements without duplicating global checklists.
- 2026-02-25: Updated skills index with standard folder layout guidance.
- 2026-02-25: Validation complete (`rg` reference checks + `npm run check` + `npm run lint` + `npm test` all passing).
- 2026-02-25: Deviations from spec: none.
- 2026-02-25: Clarified taxonomy language in `.agents/rules/entrypoint.md` as canonical modules vs skills.
- 2026-02-25: Updated `AGENTS.md` to describe `.agents/rules/` as canonical modules and `.agents/skills/` as playbooks.
- 2026-02-25: Reduced `.agents/rules/planning.md` to approval-gate policy and moved template pack to `.agents/skills/cryptosharia-planning-pack/references/template-pack.md`.
- 2026-02-25: Added governance-update policy: in-session behavior adapts immediately, persistent governance edits require explicit `codify` confirmation.
