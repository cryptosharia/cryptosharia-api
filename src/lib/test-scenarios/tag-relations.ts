import { eq } from 'drizzle-orm';

import { db } from '$lib/db';
import { postTags, tags, tokenTags } from '$lib/db/tables';

async function ensureTag(tagSlug: string, description?: string) {
	const existingTag = await db.query.tags.findFirst({
		where: eq(tags.slug, tagSlug)
	});

	if (existingTag) {
		return existingTag;
	}

	const [tag] = await db
		.insert(tags)
		.values({
			name: `Tag ${tagSlug}`,
			slug: tagSlug,
			description
		})
		.returning();

	return tag;
}

export async function attachTagToPost(postId: string, tagSlug: string, description?: string) {
	const tag = await ensureTag(tagSlug, description);

	await db.insert(postTags).values({ postId, tagId: tag.id }).onConflictDoNothing();

	return tag;
}

export async function attachTagToToken(tokenId: string, tagSlug: string, description?: string) {
	const tag = await ensureTag(tagSlug, description);

	await db.insert(tokenTags).values({ tokenId, tagId: tag.id }).onConflictDoNothing();

	return tag;
}
