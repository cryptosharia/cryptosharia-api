import { db } from '$lib/db';
import { tokens } from '$lib/db/tables';
import { eq } from 'drizzle-orm';
import { hasPermission } from '$lib/auth/permissions';
import { isUuid } from '$lib/utils';
import { toAssetMetadata } from './assets';

/**
 * Shared helper to fetch and authorize token details.
 * Returns either the mapped token record or null if not found/unauthorized.
 */
export async function fetchTokenDetail(locals: App.Locals, identifier: string) {
	const where = isUuid(identifier) ? eq(tokens.id, identifier) : eq(tokens.slug, identifier);

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
