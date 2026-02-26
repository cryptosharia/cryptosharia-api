# DB Change Report Template

```md
## DB Change Summary

### Schema and Migration Files

- `src/lib/db/tables.ts`: <change>
- `drizzle/*`: <change>

### Compatibility and Safety

- Backward compatibility: <yes/no + notes>
- Destructive operations: <none or approved details>
- Rollback/mitigation: <notes>

### API and Service Impact

- <affected routes/services/tests>

### Verification Gates

- `npm run check`: <pass/fail>
- `npm run lint`: <pass/fail>
- `npm test`: <pass/fail>
```
