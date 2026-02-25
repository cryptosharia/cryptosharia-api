# Planning Rules

These rules define how we plan and execute work in the project repository.

## Planning Files

When creating a plan for a task or feature:

- Place planning files under `planning/<plan-name>/`:
  - `plan.md`
  - `spec.md`
  - `tasks.md`
  - `execution.md`
- Use the `todowrite` tool to track progress on tasks

## Planning File Purposes

- `plan.md`: scope, architecture decisions, risks, verification commands
- `spec.md`: exact behavior contract (input/output, rules, edge cases, acceptance criteria)
- `tasks.md`: implementation checklist and task state updates
- `execution.md`: executor constraints (allowed files, order, escalation rules, done definition)

## Model Split Workflow (Planner -> Executor)

1. Planner model creates `plan + spec + tasks + execution`
2. Wait for user approval before implementation
3. Executor model implements only what `spec` and `execution` allow
4. Validate against acceptance criteria and run required checks
5. Escalate back to planner when contract changes are needed

## Escalation Rules

Escalate to planner model if:

- API or data contract must change from the approved spec
- Security, auth, billing, or migration behavior is affected
- Same blocker fails implementation more than 2 times
- Required files outside `execution.md` must be changed

## Required Gates Before Completion

- All acceptance criteria in `spec.md` are satisfied
- Verification commands in `plan.md` have been run
- Changed files match `execution.md` (or deviations are documented)
- `tasks.md` is fully updated with completed statuses

## Template Pack

Use the following templates as starting points.

### `planning/<plan-name>/plan.md`

```md
# Plan: <feature-name>

## Objective

<One-line goal>

## Scope

- <In-scope item>

## Out of Scope

- <Out-of-scope item>

## Architecture Decisions

- <Decision and reason>

## File Change Map

- `path/to/file` - <why it changes>

## Risks and Mitigations

- Risk: <risk>
  Mitigation: <mitigation>

## Acceptance Criteria

- <Testable outcome>

## Verification

- `npm run check`
- `npm run lint`
- `npm test`
```

### `planning/<plan-name>/spec.md`

```md
# Spec: <feature-name>

## Goal

<User-facing outcome>

## Non-Goals

- <Not included in this iteration>

## Contracts

### Input

<Endpoint/function/component input>

### Output

<Response/return/UI output>

### Validation Rules

- <Rule>

## Behavior Rules

- <Exact functional behavior>

## Edge Cases

- <Edge case>

## Acceptance Criteria

- <Must-pass condition>
```

### `planning/<plan-name>/tasks.md`

```md
# Tasks: <feature-name>

- [ ] <Implement part A>
- [ ] <Implement part B>
- [ ] <Add/update tests>
- [ ] <Run verification commands>

## Definition of Done

- [ ] Acceptance criteria satisfied
- [ ] Checks/tests pass
- [ ] Deviations documented

## Execution Log

- <Timestamped progress updates>
```

### `planning/<plan-name>/execution.md`

```md
# Execution: <feature-name>

## Context

Implementation must follow `planning/<plan-name>/spec.md`.

## Execution Order

1. <Step 1>
2. <Step 2>

## Allowed Files

- `path/to/file`

## Constraints

- Do not change external contracts unless spec is updated and approved
- Do not edit unrelated files

## Escalation

- Contract changes needed
- More than 2 failed attempts on same blocker

## Done Definition

- Acceptance criteria satisfied
- Verification commands pass
- Final diff documented

## Final Report Format

- Files changed
- Test/check results
- Deviations from spec
```
