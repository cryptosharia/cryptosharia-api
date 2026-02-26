# Security Finding Severity Model

Use this model to keep audit output consistent and actionable.

## Severity Levels

- `critical`: auth bypass, token replay vulnerability, secret exposure, trust-boundary bypass.
- `high`: missing authorization checks, sensitive data leaks, unsafe write patterns on privileged paths.
- `medium`: inconsistent error behavior, weak cache headers for sensitive endpoints, incomplete validation.
- `low`: hardening opportunities, minor logging hygiene issues, defense-in-depth improvements.

## Required Action

- `critical` and `high` must be fixed before finalization.
- `medium` should be fixed now unless explicitly deferred with residual risk.
- `low` can be deferred with rationale if no immediate impact.

## Finding Format

- `path`: file path
- `risk`: severity + short impact
- `fix`: concrete remediation
