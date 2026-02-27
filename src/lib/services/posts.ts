import { db } from '$lib/db';
import { posts } from '$lib/db/tables';
import { eq } from 'drizzle-orm';
import { hasPermission } from '$lib/auth/permissions';
import { isUuid } from '$lib/utils';
import { toAssetMetadata } from './assets';

/**
 * Shared helper to fetch and authorize post details.
 * Returns either the mapped post record or null if not found/unauthorized.
 */
export async function fetchPostDetail(locals: App.Locals, identifier: string) {
	const where = isUuid(identifier) ? eq(posts.id, identifier) : eq(posts.slug, identifier);

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
