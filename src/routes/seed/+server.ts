import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import * as schema from '$lib/db/tables';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import ApiResponse from '$lib/api-response';
import { eq } from 'drizzle-orm';
import { MESSAGES, POSTS, TOKENS, USERS } from './data';
import { hashPassword } from '$lib/auth/password';

export const POST: RequestHandler = async () => {
	// Only allow seeding in local development or Vercel preview environments
	// env.VERCEL_ENV is automatically provided by Vercel
	if (!dev && env.VERCEL_ENV !== 'preview') {
		return ApiResponse.forbidden('Seeding is forbidden in production environment');
	}

	try {
		console.log('--- Seeding started via API ---');

		// Clear existing data (Cascade will handle relations)
		await db.delete(schema.refreshTokens);
		await db.delete(schema.posts);
		await db.delete(schema.tokens);
		await db.delete(schema.tags);
		await db.delete(schema.assets);
		await db.delete(schema.messages);
		await db.delete(schema.users);

		// Seed Users
		const seededUsers: Record<string, string> = {};
		for (const userData of USERS) {
			const hashedPassword = await hashPassword(userData.password);
			const [user] = await db
				.insert(schema.users)
				.values({
					name: userData.name,
					email: userData.email,
					hashedPassword,
					roleId: userData.roleId
				})
				.returning({ id: schema.users.id });
			seededUsers[userData.name] = user.id;
		}
		console.log(`Seeded ${USERS.length} users`);

		const adminId = seededUsers['Admin User'];
		const editorId = seededUsers['Editor User'];

		// Seed Posts
		for (const postData of POSTS) {
			const { tags: tagNames, coverImage, ...postFields } = postData;

			// 1. Create cover image asset if provided
			let coverImageId: string | undefined;
			if (coverImage) {
				const [asset] = await db
					.insert(schema.assets)
					.values(coverImage)
					.returning({ id: schema.assets.id });
				coverImageId = asset.id;
			}

			// 2. Insert Post with audit metadata
			const [insertedPost] = await db
				.insert(schema.posts)
				.values({
					...postFields,
					coverImageId,
					createdBy: adminId,
					updatedBy: editorId
				})
				.returning({ id: schema.posts.id });

			// 3. Handle tags
			if (tagNames && tagNames.length > 0) {
				for (const tagName of tagNames) {
					const slug = tagName.toLowerCase().replace(/ /g, '-');

					// Insert tag if not exists
					await db.insert(schema.tags).values({ name: tagName, slug }).onConflictDoNothing();

					// Get tag
					const [tag] = await db.select().from(schema.tags).where(eq(schema.tags.slug, slug));

					// Link post to tag
					if (tag) {
						await db
							.insert(schema.postTags)
							.values({ postId: insertedPost.id, tagId: tag.id })
							.onConflictDoNothing();
					}
				}
			}
		}

		// Seed Tokens
		for (const tokenData of TOKENS) {
			const { tags: tagNames, logo, ...tokenFields } = tokenData;

			// 1. Create logo asset if provided
			let logoId: string | undefined;
			if (logo) {
				const [asset] = await db
					.insert(schema.assets)
					.values(logo)
					.returning({ id: schema.assets.id });
				logoId = asset.id;
			}

			// 2. Insert Token with audit metadata
			const [insertedToken] = await db
				.insert(schema.tokens)
				.values({
					...tokenFields,
					logoId,
					createdBy: adminId,
					updatedBy: editorId
				})
				.returning({ id: schema.tokens.id });

			// 3. Handle tags
			if (tagNames && tagNames.length > 0) {
				for (const tagName of tagNames) {
					const slug = tagName.toLowerCase().replace(/ /g, '-');

					// Insert tag if not exists
					await db.insert(schema.tags).values({ name: tagName, slug }).onConflictDoNothing();

					// Get tag
					const [tag] = await db.select().from(schema.tags).where(eq(schema.tags.slug, slug));

					// Link token to tag
					if (tag) {
						await db
							.insert(schema.tokenTags)
							.values({ tokenId: insertedToken.id, tagId: tag.id })
							.onConflictDoNothing();
					}
				}
			}
		}

		// Seed Messages
		for (const messageData of MESSAGES) {
			await db.insert(schema.messages).values(messageData);
		}

		return ApiResponse.created(undefined, 'Sample data seeded successfully');
	} catch (err) {
		console.error('Seeding failed:', err);
		return ApiResponse.internalServerError();
	}
};
