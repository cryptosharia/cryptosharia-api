import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { users, refreshTokens } from '$lib/db/tables';
import { eq } from 'drizzle-orm';
import ApiResponse from '$lib/api-response';
import { AuthSigninPostBody, AuthSigninPostResponse } from '.';
import { verifyPassword } from '$lib/auth/password';
import { signAccessToken, generateRandomToken } from '$lib/auth/tokens';
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
			return ApiResponse.unauthorized();
		}

		// 3. Verify password
		const isValid = await verifyPassword(password, user.hashedPassword);
		if (!isValid) {
			return ApiResponse.unauthorized();
		}

		// 4. Generate access token
		const accessToken = await signAccessToken({
			userId: user.id,
			roleId: user.roleId
		});

		// 5. Generate opaque refresh token
		const refreshToken = generateRandomToken();

		// Calculate expiry (7 days from now)
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 7);

		// 6. Store refresh token in database
		await db.insert(refreshTokens).values({
			userId: user.id,
			token: refreshToken,
			expiresAt
		});

		// 7. Return response (schema automatically strips sensitive fields)
		return ApiResponse.ok({
			user: AuthSigninPostResponse.shape.user.parse(user),
			accessToken,
			refreshToken
		} as AuthSigninPostResponse);
	} catch (error) {
		console.error('Signin error:', error);
		return ApiResponse.internalServerError();
	}
};
