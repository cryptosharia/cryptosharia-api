# CryptoSharia API Skills

This directory contains OpenCode skills for `cryptosharia-api` workflows.

## Skill Folder Layout

```
<skill-name>/
  SKILL.md                 # required entrypoint
  rules/*.md               # optional skill-specific constraints
  references/*.md          # optional templates/examples
```

## Available Skills

| Skill                                   | Use for                                     |
| --------------------------------------- | ------------------------------------------- |
| `cryptosharia-api-route-implementation` | Adding/updating route handlers              |
| `cryptosharia-security-audit`           | Security checks before finalizing changes   |
| `cryptosharia-planning-pack`            | Creating planning packs with approval gates |
| `cryptosharia-openapi-sync`             | Keeping OpenAPI and types in sync           |
| `cryptosharia-db-change-implementation` | Drizzle schema/migration changes            |
| `cryptosharia-business-brainstorm`      | Product/business ideation                   |

## Suggested Skill Chains

- **New endpoint**: `planning` → `route-implementation` → `openapi-sync` → `security-audit`
- **DB-impacting**: `planning` → `db-change` → `route-implementation` → `security-audit`
- **Business idea**: `business-brainstorm` → `planning`
