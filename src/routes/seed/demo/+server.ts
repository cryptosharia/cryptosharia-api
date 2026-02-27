import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import * as schema from '$lib/db/tables';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { ApiResponse } from '$lib/api';
import { eq } from 'drizzle-orm';
import { hashPassword } from '$lib/auth/password';
import type { Role } from '$lib/auth/rbac';
import { MESSAGES, POSTS, TOKENS, USERS } from './data';

/**
 * POST /seed/demo
 * Populates the system with mock data for development and testing.
 * **WARNING: This will wipe out all existing data.**
 * Strictly forbidden in production.
 */
export const POST: RequestHandler = async () => {
	// Guard: dev or preview only. Never allow in production.
	const isAllowedEnv = dev || env.VERCEL_ENV === 'preview';

	if (!isAllowedEnv) {
		return ApiResponse.forbidden('Demo seeding is strictly forbidden in production');
	}

	try {
		console.log('--- Demo Seeding Started ---');

		// 1. Clear existing content data
		await db.delete(schema.refreshTokens);
		await db.delete(schema.emailVerifications); // Added missing cleanup
		await db.delete(schema.postTags);
		await db.delete(schema.tokenTags);
		await db.delete(schema.posts);
		await db.delete(schema.tokens);
		await db.delete(schema.tags);
		await db.delete(schema.users); // Delete users before assets (avatarId FK)
		await db.delete(schema.assets);
		await db.delete(schema.messages);
		await db.delete(schema.activityLogs); // Clean logs too

		// 2. Seed Users
		const seededUsers: Record<string, string> = {};
		for (const userData of USERS) {
			const hashedPassword = await hashPassword(userData.password);

			const [user] = await db
				.insert(schema.users)
				.values({
					name: userData.name,
					email: userData.email,
					hashedPassword,
					role: userData.role as Role,
					status: userData.status || 'active',
					isEmailVerified: userData.isEmailVerified
				})
				.returning({ id: schema.users.id });
			seededUsers[userData.name] = user.id;
		}
		console.log(`Seeded ${USERS.length} demo users`);

		const adminId = seededUsers['Super Admin'];

		// 4. Seed Posts
		for (const postData of POSTS) {
			const { tags: tagNames, coverImage, ...postFields } = postData;

			const [asset] = await db
				.insert(schema.assets)
				.values(coverImage)
				.returning({ id: schema.assets.id });
			const coverImageId = asset.id;

			const [insertedPost] = await db
				.insert(schema.posts)
				.values({
					...postFields,
					coverImageId,
					createdBy: adminId,
					updatedBy: adminId
				})
				.returning({ id: schema.posts.id });

			if (tagNames && tagNames.length > 0) {
				for (const tagName of tagNames) {
					const slug = tagName.toLowerCase().replace(/ /g, '-');
					await db.insert(schema.tags).values({ name: tagName, slug }).onConflictDoNothing();
					const [tag] = await db.select().from(schema.tags).where(eq(schema.tags.slug, slug));
					if (tag) {
						await db
							.insert(schema.postTags)
							.values({ postId: insertedPost.id, tagId: tag.id })
							.onConflictDoNothing();
					}
				}
			}
		}
		console.log(`Seeded ${POSTS.length} demo posts`);

		// 5. Seed Tokens
		for (const tokenData of TOKENS) {
			const { tags: tagNames, logo, ...tokenFields } = tokenData;

			const [asset] = await db
				.insert(schema.assets)
				.values(logo)
				.returning({ id: schema.assets.id });
			const logoId = asset.id;

			const [insertedToken] = await db
				.insert(schema.tokens)
				.values({
					...tokenFields,
					logoId,
					createdBy: adminId,
					updatedBy: adminId
				})
				.returning({ id: schema.tokens.id });

			if (tagNames && tagNames.length > 0) {
				for (const tagName of tagNames) {
					const slug = tagName.toLowerCase().replace(/ /g, '-');
					await db.insert(schema.tags).values({ name: tagName, slug }).onConflictDoNothing();
					const [tag] = await db.select().from(schema.tags).where(eq(schema.tags.slug, slug));
					if (tag) {
						await db
							.insert(schema.tokenTags)
							.values({ tokenId: insertedToken.id, tagId: tag.id })
							.onConflictDoNothing();
					}
				}
			}
		}
		console.log(`Seeded ${TOKENS.length} demo tokens`);

		// 6. Seed Messages
		for (const messageData of MESSAGES) {
			await db.insert(schema.messages).values(messageData);
		}
		console.log(`Seeded ${MESSAGES.length} demo messages`);

		return ApiResponse.created(undefined, 'Demo data seeded successfully');
	} catch (error) {
		console.error('Seed demo error:', error);
		return ApiResponse.internalServerError('Failed to seed demo data');
	}
};
