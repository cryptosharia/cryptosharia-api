# Spec: Add Tags to Posts and Tokens Routes

## Objective

Expose tags in `/posts`, `/posts/{id}`, `/tokens`, and `/tokens/{id}` responses, and add optional list filtering with query param name `tags`.

## Scope

- In scope: Route contracts, route/service query loading, response mapping, OpenAPI/type sync, and integration tests for tags response + tags filtering.
- Out of scope: Creating/updating/deleting tags, admin tagging workflows, DB schema changes, and any change to auth/RBAC semantics.

## Architecture Decisions

- Keep contract-first flow: update `index.ts` schemas before handler/service changes.
- Reuse existing many-to-many relations (`postTags`, `tokenTags`) and return a whitelisted tag shape only.
- Use query parameter name `tags` (not `tagSlugs`/`tagIds`) and interpret it as tag slugs.
- Apply filtering only on list endpoints (`GET /posts`, `GET /tokens`), not detail endpoints.

## Contracts

### Input

- `GET /posts` query: add optional `tags: string[]`.
- `GET /tokens` query: add optional `tags: string[]`.
- `tags` contains tag slugs.

### Output

- `PostsGetItem` and `TokensGetItem` include:

```ts
tags: Array<{
	id: string;
	name: string;
	slug: string;
}>;
```

- `PostsGetData` and `TokensGetData` include:

```ts
tags: Array<{
	id: string;
	name: string;
	slug: string;
	description: string | null;
}>;
```

### Validation Rules

- `tags` must parse as string array query input using existing query parsing helpers.
- Empty/omitted `tags` means no tag-based filtering.
- Response tags are schema-validated/whitelisted through Zod route schemas.

## Behavior Rules

- List endpoints include tags for each item.
- Detail endpoints include tags for the returned entity.
- List filtering by `tags` uses OR semantics: item matches if it has at least one requested tag slug.
- Existing status/permission behavior remains unchanged (`401`/`403` semantics stay intact).

## Edge Cases

- Unknown tag slugs return empty list for list endpoints (not an error).
- Mixed valid/invalid tag slugs still return matches for valid slugs.
- Duplicate tag slugs in query do not change logical results.
- Items without tags still appear when `tags` filter is absent.

## Risks and Mitigations

- Risk: Contract/runtime drift after schema changes.
  Mitigation: Update route schemas, handler/service mapping, tests, and generated API types in the same change set.
- Risk: Over-fetching nested relations.
  Mitigation: Select only required tag fields (`id`, `name`, `slug`) in relation loads.
- Risk: Permission regression while touching list/detail queries.
  Mitigation: Keep auth checks and status filters untouched; add regression tests for unchanged behavior where relevant.

## Acceptance Criteria

- [x] `GET /posts` and `GET /tokens` responses include `tags` per item.
- [x] `GET /posts/{id}` and `GET /tokens/{id}` responses include `tags`.
- [x] `GET /posts?tags=...` filters by tag slug with OR semantics.
- [x] `GET /tokens?tags=...` filters by tag slug with OR semantics.
- [x] OpenAPI contracts and `src/lib/api-types.ts` reflect `tags` query and response fields.
- [x] Integration tests cover positive and negative paths for tags response/filtering.

## Verification

- `npm run check`
- `npm run lint`
- `npm test`
