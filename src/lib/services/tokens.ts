import { db } from '$lib/db';
import { tokens, tags } from '$lib/db/tables';
import { eq, inArray, or } from 'drizzle-orm';
import { hasPermission } from '$lib/auth/permissions';
import { isUuid } from '$lib/utils';
import { toAssetMetadata } from './assets';

export function tokenIdentifierFilter(identifier: string) {
	return isUuid(identifier) ? eq(tokens.id, identifier) : eq(tokens.slug, identifier);
}

export async function findTokenByIdentifier(identifier: string) {
	return db.query.tokens.findFirst({ where: tokenIdentifierFilter(identifier) });
}

type ResolveTokenTagsResult =
	| {
			ok: true;
			tagIds: string[];
	  }
	| {
			ok: false;
			missingIdentifiers: string[];
	  };

export async function resolveTokenTagIdentifiers(
	identifiers: string[]
): Promise<ResolveTokenTagsResult> {
	const normalized = [...new Set(identifiers.map((value) => value.trim()).filter(Boolean))];

	if (normalized.length === 0) {
		return { ok: true, tagIds: [] };
	}

	const idIdentifiers = normalized.filter(isUuid);
	const slugIdentifiers = normalized.filter((value) => !isUuid(value));
	const filters = [];

	if (idIdentifiers.length > 0) {
		filters.push(inArray(tags.id, idIdentifiers));
	}

	if (slugIdentifiers.length > 0) {
		filters.push(inArray(tags.slug, slugIdentifiers));
	}

	const where = filters.length > 1 ? or(...filters) : filters[0];
	const matchedTags = where
		? await db.select({ id: tags.id, slug: tags.slug }).from(tags).where(where)
		: [];

	const missingIdentifiers = normalized.filter((identifier) => {
		if (isUuid(identifier)) {
			return !matchedTags.some((tag) => tag.id === identifier);
		}

		return !matchedTags.some((tag) => tag.slug === identifier);
	});

	if (missingIdentifiers.length > 0) {
		return { ok: false, missingIdentifiers };
	}

	return {
		ok: true,
		tagIds: [...new Set(matchedTags.map((tag) => tag.id))]
	};
}

/**
 * Shared helper to fetch and authorize token details.
 * Returns either the mapped token record or null if not found/unauthorized.
 */
export async function fetchTokenDetail(locals: App.Locals, identifier: string) {
	const where = tokenIdentifierFilter(identifier);

	const token = await db.query.tokens.findFirst({
		where,
		columns: {
			logoId: false
		},
		with: {
			logo: true,
			tags: {
				columns: {},
				with: {
					tag: {
						columns: {
							id: true,
							name: true,
							slug: true,
							description: true
						}
					}
				}
			},
			createdBy: {
				columns: {
					id: true,
					name: true,
					email: true
				}
			},
			updatedBy: {
				columns: {
					id: true,
					name: true,
					email: true
				}
			}
		}
	});

	if (!token) {
		return null;
	}

	// Authorization: Non-published content require tokens.manage permission
	if (token.status !== 'published' && !hasPermission(locals, 'tokens.manage')) {
		return null;
	}

	return {
		...token,
		tags: token.tags.map((tokenTag) => tokenTag.tag),
		logo: toAssetMetadata(token.logo)
	};
}
