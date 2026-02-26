# Planning Template Pack

Use these templates as a starting point for `planning/<plan-name>/`.

## `plan.md`

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

## `spec.md`

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

## `tasks.md`

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

## `execution.md`

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
