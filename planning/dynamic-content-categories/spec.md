# Spec: Dynamic Content Categories

## Objective

Allow authorized CMS users to designate existing tags as ordered, public content categories for the Berita and Edukasi sections, then have the public site render those categories dynamically.

## Scope

- In scope: additive metadata on existing tags (`contentSection`, `showInNavigation`, `displayOrder`).
- In scope: API read/write support, OpenAPI contract updates, admin controls, and public-site category loading.
- In scope: a migration that leaves all existing tags unchanged and hidden from public navigation by default.
- Out of scope: automatic classification of existing posts, a new taxonomy table, Riset/Opini/Metodologi pages, or changes to post section enums.

## Architecture Decisions

- Reuse the existing `tags` table so categories can continue to be assigned to posts through the current post-tag relation.
- Store the intended public section (`news` or `education`) separately from the post's section. A tag only becomes a public category when `showInNavigation` is true.
- Keep the public API filter explicit; never infer navigation categories from all tags.
- Keep a frontend fallback to the current seven categories while the API rollout is incomplete, preventing a transient empty navigation.

## Contracts

### Input

- `POST /tags` and `PATCH /tags/{id}` accept optional `contentSection`, `showInNavigation`, and `displayOrder`.
- `GET /tags` accepts optional `contentSections` and `showInNavigation` filters.

### Output

- Tag responses include `contentSection`, `showInNavigation`, and `displayOrder`.
- Public media navigation and category filters read only tags marked for navigation in their matching section, ordered by `displayOrder` then name.

### Validation Rules

- `contentSection` is limited to `news` or `education` when present.
- A tag with `showInNavigation: true` must have `contentSection`.
- `displayOrder` is a non-negative integer when present.
- Existing tags remain valid with all new values unset/defaulted.

## Behavior Rules

- Only users with the existing `tags.manage` permission can create or update category metadata.
- Public category queries remain protected by the existing API key boundary; media requests them server-side.
- Non-category tags continue to work unchanged for posts and tokens and never appear in public category navigation.

## Edge Cases

- If no public categories are returned, the media site uses the current configured categories as a temporary fallback.
- A hidden category remains assignable to posts but does not appear in menus or public category tabs.
- Changing a category slug does not automatically rewrite post relations; the existing tag relation remains by ID.

## Risks and Mitigations

- Risk: unclassified existing posts produce empty category results.
  Mitigation: categories are configurable independently; content assignment remains an explicit editorial task.
- Risk: API and media deploy at different times.
  Mitigation: additive database fields and frontend fallback preserve existing public behavior.

## Acceptance Criteria

- An authorized admin can set a tag as a Berita or Edukasi public category, choose its order, and hide it again.
- Unauthorized callers cannot modify category metadata.
- `GET /tags` can return only visible categories for a requested section in the configured order.
- Header and Berita/Edukasi filters use the API-provided categories after deployment.
- Existing tags, post assignments, and token assignments remain intact.

## Verification

- API: `npm run check`, `npm run lint`, `npm test`.
- Admin and media: `npm run check`, `npm run build`.
