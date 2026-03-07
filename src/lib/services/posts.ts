import { db } from '$lib/db';
import { posts, tags } from '$lib/db/tables';
import { eq, inArray, or } from 'drizzle-orm';
import { hasPermission } from '$lib/auth/permissions';
import { isUuid } from '$lib/utils';
import { toAssetMetadata } from './assets';

export function postIdentifierFilter(identifier: string) {
	return isUuid(identifier) ? eq(posts.id, identifier) : eq(posts.slug, identifier);
}

export async function findPostByIdentifier(identifier: string) {
	return db.query.posts.findFirst({ where: postIdentifierFilter(identifier) });
}

type ResolvePostTagsResult =
	| {
			ok: true;
			tagIds: string[];
	  }
	| {
			ok: false;
			missingIdentifiers: string[];
	  };

export async function resolvePostTagIdentifiers(
	identifiers: string[]
): Promise<ResolvePostTagsResult> {
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
 * Shared helper to fetch and authorize post details.
 * Returns either the mapped post record or null if not found/unauthorized.
 */
export async function fetchPostDetail(locals: App.Locals, identifier: string) {
	const where = postIdentifierFilter(identifier);

	const post = await db.query.posts.findFirst({
		where,
		columns: {
			coverImageId: false
		},
		with: {
			coverImage: true,
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

	if (!post) {
		return null;
	}

	// Authorization: Non-published content require posts.manage permission
	if (post.status !== 'published' && !hasPermission(locals, 'posts.manage')) {
		return null;
	}

	return {
		...post,
		tags: post.tags.map((postTag) => postTag.tag),
		coverImage: toAssetMetadata(post.coverImage)
	};
}
