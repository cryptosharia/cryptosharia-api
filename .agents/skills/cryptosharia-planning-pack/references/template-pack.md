# Planning Template Pack

Use these templates as a starting point for `planning/<plan-name>/`.

## `spec.md`

```md
# Spec: <feature-name>

## Objective

<One-line goal>

## Scope

- In scope: <item>
- Out of scope: <item>

## Architecture Decisions

- <Decision and reason>

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

## Risks and Mitigations

- Risk: <risk>
  Mitigation: <mitigation>

## Acceptance Criteria

- <Must-pass condition>

## Verification

- `npm run check`
- `npm run lint`
- `npm test`
```

## `tasks.md`

```md
# Tasks: <feature-name>

## Allowed Files

- `path/to/file`

## Constraints

- Do not change external contracts unless spec is updated and approved
- Do not edit unrelated files

## Implementation Checklist

- [ ] <Implement part A>
- [ ] <Implement part B>
- [ ] <Add/update tests>
- [ ] <Run verification commands>

## Escalation Triggers

- Contract changes needed
- More than 2 failed attempts on same blocker

## Definition of Done

- [ ] Acceptance criteria satisfied
- [ ] Checks/tests pass
- [ ] Deviations documented

## Execution Log

- <Timestamped progress updates>

## Final Report

- Files changed: <list>
- Test/check results: <pass/fail>
- Deviations from spec: <none or details>
```
