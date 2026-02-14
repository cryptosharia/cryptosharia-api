import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { users, refreshTokens } from '$lib/db/tables';
import { eq } from 'drizzle-orm';
import ApiResponse from '$lib/api-response';
import { AuthSigninPostBody, AuthSigninPostResponse } from '..';
import { verifyPassword, needsRehash, hashPassword } from '$lib/auth/password';
import { signAccessToken, createRefreshToken } from '$lib/auth/tokens';
import z from '$lib/zod-openapi';

/**
 * POST /auth/signin
 * Authenticate user with email and password.
 */
export const POST: RequestHandler = async ({ request }) => {
	// 1. Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return ApiResponse.badRequest({ body: ['Invalid JSON'] });
	}

	const result = AuthSigninPostBody.safeParse(body);
	if (!result.success) {
		return ApiResponse.badRequest(z.flattenError(result.error).fieldErrors);
	}

	const { email, password } = result.data;

	try {
		// 2. Find user by email
		const user = await db.query.users.findFirst({
			where: eq(users.email, email)
		});

		if (!user) {
			return ApiResponse.unauthorized('Invalid email or password');
		}

		// 3. Enforce Email Verification
		// We return 401 Unauthorized for unverified accounts to mask their existence for privacy.
		// signup route handles re-registration gracefully.
		if (!user.isEmailVerified) {
			return ApiResponse.unauthorized('Invalid email or password');
		}

		// 3b. Enforce Account Status
		if (user.status !== 'active') {
			return ApiResponse.forbidden('Your account is not active. Please contact support.');
		}

		// 4. Verify password
		const isValid = await verifyPassword(password, user.hashedPassword);
		if (!isValid) {
			return ApiResponse.unauthorized('Invalid email or password');
		}

		// 5. Rehash password if crypto parameters have changed
		if (needsRehash(user.hashedPassword)) {
			const newHash = await hashPassword(password);
			await db.update(users).set({ hashedPassword: newHash }).where(eq(users.id, user.id));
		}

		// 6. Update lastLoginAt
		await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

		// 7. Generate access token
		const accessToken = await signAccessToken({
			userId: user.id,
			role: user.role
		});

		// 8. Generate opaque refresh token
		const refreshToken = createRefreshToken(user.id);

		// 9. Store refresh token in database
		await db.insert(refreshTokens).values(refreshToken);

		// 8. Return response (sanitized via parse)
		return ApiResponse.ok(
			AuthSigninPostResponse.parse({
				user,
				accessToken,
				refreshToken: refreshToken.token
			}),
			'Signed in successfully'
		);
	} catch (error) {
		console.error('Signin error:', error);
		return ApiResponse.internalServerError();
	}
};
