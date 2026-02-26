# Coding Conventions

These conventions apply when working in `cryptosharia-api`.

## TypeScript

- Strict mode is enabled in `tsconfig.json`.
- Always use proper TypeScript types; avoid `any`.
- `checkJs: true` means JavaScript files also need type annotations.
- Use `typescript-eslint` for TypeScript-specific linting.
- Prefer `type` over `interface` for type definitions.

## Prettier

Follow the repo Prettier config.

## ESLint

- Use the repo ESLint config.
- Prettier integration avoids formatting conflicts.
- `no-undef` is disabled (handled by TypeScript).

## Import Conventions

### Aliases

- Use `$lib` alias for internal library imports.

### Import Ordering

Group imports in this order:

1. External libraries
2. `$lib` imports
3. Relative imports

## Naming Conventions

| Type                | Convention       | Example                   |
| ------------------- | ---------------- | ------------------------- |
| Functions/variables | camelCase        | `handleSubmit`, `isValid` |
| Constants           | UPPER_SNAKE_CASE | `MAX_ITEMS`               |
| Files               | kebab-case       | `auth-utils.ts`           |
| Types               | PascalCase       | `UserResponse`            |

## Error Handling

- Use `try/catch` for async operations.
- Return consistent error shapes for API routes.
- Do not leak internal errors in responses.

## Testing

- Use Vitest for tests.
- Prefer real HTTP integration tests when validating routes.
- Test files should be named `*.test.ts`.
