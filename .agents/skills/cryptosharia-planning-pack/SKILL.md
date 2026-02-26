---
name: cryptosharia-planning-pack
description: Create planning pack files (plan/spec/tasks/execution) and enforce approval-gated implementation
---

# CryptoSharia Planning Pack

## When to use

Use this skill for scoped features/refactors with multiple steps, security impact, or contract impact.

## Source of truth

- `.agents/rules/planning.md`
- `.agents/rules/entrypoint.md`

## Local supplements

- `references/plan-review-checklist.md`
- `references/template-pack.md`

## Workflow

1. Create a plan folder: `planning/<plan-name>/`
   - Include `plan.md`, `spec.md`, `tasks.md`, and `execution.md`

2. Fill each file with concrete, testable content
   - Use `references/template-pack.md` as the baseline structure
   - `plan.md`: objective, scope, risks, verification commands
   - `spec.md`: exact contract and acceptance criteria
   - `tasks.md`: implementation checklist and execution log
   - `execution.md`: execution order, allowed files, constraints

3. Define verification gates in `plan.md`
   - `npm run check`
   - `npm run lint`
   - `npm test`

4. Pause for user approval before implementation
   - Do not execute implementation before explicit approval

5. Execute according to `execution.md`
   - Change only allowed files
   - Keep `tasks.md` and task states updated during execution

6. Escalate back to planning when needed
   - Contract change required
   - Security/billing/migration impact appears
   - Same blocker fails more than 2 times

## Done definition

- Acceptance criteria in `spec.md` are satisfied
- Verification commands pass
- `tasks.md` is fully updated
- Deviations are explicitly documented

## Final report format

- Files changed
- Check/test results
- Deviations from approved spec
