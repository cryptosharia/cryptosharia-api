# Security Audit Report Template

```md
## Security Audit Report

### Scope

- <changed paths or modules>

### Findings

- <none>
  or
- path: `path/to/file`
  risk: `<critical|high|medium|low> - <impact>`
  fix: `<what changed or must change>`

### Residual Risk

- <none>
  or
- <explicit deferred risk + rationale>

### Verification Gates

- `npm run check`: <pass/fail>
- `npm run lint`: <pass/fail>
- `npm test`: <pass/fail>
```
