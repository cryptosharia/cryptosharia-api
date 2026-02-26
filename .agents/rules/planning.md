# Planning Policy

This module defines when planning is mandatory and what gates must be satisfied before implementation is considered complete.

## When Planning Is Required

Create a planning pack for tasks that are scoped features/refactors and meet one or more of these conditions:

- Touches auth, security, billing, migration, or API/data contracts.
- Requires multiple implementation steps across modules.
- Needs explicit file boundaries or escalation rules.
- User explicitly asks for planning-first execution.

## Required Planning Pack

For required planning work, create files under `planning/<plan-name>/`:

- `plan.md`
- `spec.md`
- `tasks.md`
- `execution.md`

Track progress in both `tasks.md` and tool-level task state updates.

## Approval Gate

- Do not start implementation until the user explicitly approves the plan.

## Execution Constraints

- Implement only what `spec.md` and `execution.md` allow.
- Keep file changes within `execution.md` allowed files unless deviations are documented.

## Escalation Rules

Escalate back to planning when:

- API or data contracts must change from approved spec.
- Security/auth/billing/migration behavior changes from approved spec.
- Same blocker fails implementation more than 2 times.
- Required edits fall outside `execution.md` allowed files.

## Required Gates Before Completion

- All acceptance criteria in `spec.md` are satisfied.
- Verification commands in `plan.md` have been run.
- Changed files match `execution.md` (or deviations are documented).
- `tasks.md` is fully updated with completed statuses and execution log.

## Templates and Execution Playbook

- Planning execution workflow lives in `.agents/skills/cryptosharia-planning-pack/SKILL.md`.
- Planning templates live in `.agents/skills/cryptosharia-planning-pack/references/template-pack.md`.
