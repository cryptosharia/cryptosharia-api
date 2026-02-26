# Spec: Add Users Endpoint

## Objective

Add a new `/users` POST endpoint to allow creating users via API.

## Scope

- In scope: Create `/users` POST endpoint with validation
- Out of scope: User authentication, role management

## Architecture Decisions

- Use existing `createUser` service from `$lib/services/users`
- Follow Zod schema validation pattern from existing endpoints
- Register in OpenAPI registry

## Contracts

### Input

```typescript
{
  name: string (max 100)
  email: string (valid email)
  password: string (min 8 chars)
}
```

### Output

```typescript
{
	id: string(UUID);
	name: string;
	email: string;
	createdAt: string(ISO);
}
```

### Validation Rules

- Email must be unique
- Password min 8 characters
- Name required, max 100 chars

## Behavior Rules

- Return 201 on success
- Return 400 for validation errors
- Return 409 for duplicate email

## Edge Cases

- Duplicate email conflict
- Missing required fields

## Risks and Mitigations

- Risk: Duplicate email
  Mitigation: Check uniqueness before insert

## Acceptance Criteria

- [ ] Endpoint returns 201 with user data
- [ ] Validation errors return 400
- [ ] Duplicate email returns 409
- [ ] Tests pass

## Verification

- `npm run check`
- `npm run lint`
- `npm test`
