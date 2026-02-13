import { db } from '$lib/db';
import { users } from '$lib/db/tables';
import { eq, and, isNull } from 'drizzle-orm';
import { hashPassword } from '$lib/auth/password';
import ApiResponse from '$lib/api-response';
import { AuthSignupPostBody, AuthSignupPostResponse } from '..';
import type { RequestHandler } from './$types';
import z from '$lib/zod-openapi';
import { generateRandomToken } from '$lib/auth/tokens';
import { emailVerifications } from '$lib/db/tables';

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return ApiResponse.badRequest({ body: ['Invalid JSON'] });
	}

	// 1. Validation
	const parseResult = AuthSignupPostBody.safeParse(body);
	if (!parseResult.success) {
		return ApiResponse.badRequest(z.flattenError(parseResult.error).fieldErrors);
	}

	const { name, email, password } = parseResult.data;

	// 2. Check for existing email (and verification status)
	const existingUser = await db.query.users.findFirst({
		where: eq(users.email, email)
	});

	if (existingUser && existingUser.isEmailVerified) {
		return ApiResponse.conflict('Email already registered');
	}

	try {
		// 3. Hash Password
		const hashedPassword = await hashPassword(password);

		let newUser;

		if (existingUser) {
			// 4. Graceful Re-registration: Update existing unverified account
			[newUser] = await db
				.update(users)
				.set({
					name,
					hashedPassword,
					status: 'active' // In case it was disabled
				})
				.where(eq(users.id, existingUser.id))
				.returning();
		} else {
			// 4. Create New User
			            [newUser] = await db
			                                    .insert(users)
			                                    .values({
			                                        name,
			                                        email,
			                                        hashedPassword,
			                                        status: 'active',
			                                        isEmailVerified: false
			                                    })
			                                    .returning();				
		}

		// 5. Generate and Store Verification Token
		const verificationToken = generateRandomToken(32); // 64 chars hex
		const expiresAt = new Date();
		expiresAt.setHours(expiresAt.getHours() + 6); // 6 hours of expiration

		await db.transaction(async (tx) => {
			// Revoke previous active tokens,
			// but if there is no previous tokens, it will skip automatically
			await tx
				.update(emailVerifications)
				.set({ revokedAt: new Date() })
				.where(
					and(eq(emailVerifications.userId, newUser.id), isNull(emailVerifications.revokedAt))
				);

			// Insert new one
			await tx.insert(emailVerifications).values({
				userId: newUser.id,
				token: verificationToken,
				expiresAt
			});
		});

		// 6. Return Response
		return ApiResponse.created(
			AuthSignupPostResponse.parse(newUser),
			'User registered successfully. Please check your email for verification (Not implemented yet).'
		);
	} catch (error) {
		console.error('Signup error:', error);
		return ApiResponse.internalServerError();
	}
};
