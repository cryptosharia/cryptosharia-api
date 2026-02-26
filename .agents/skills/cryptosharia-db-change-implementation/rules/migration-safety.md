# Migration Safety Rules

Use these constraints for schema and migration work.

## Safety Baseline

- Keep schema intent explicit before generating migrations.
- Prefer additive changes first when backward compatibility is needed.
- Avoid destructive operations without explicit user approval.

## Write and Data Safety

- Confirm application write paths are updated for schema changes.
- Keep field whitelisting explicit after schema updates.
- Ensure sensitive fields remain excluded from API responses.

## Operational Readiness

- Document rollback or mitigation strategy when change risk is high.
- Capture impacted endpoints/services/tests in final report.
