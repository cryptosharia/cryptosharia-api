import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { users, refreshTokens } from '$lib/db/tables';
import { eq } from 'drizzle-orm';
import ApiResponse from '$lib/api-response';
import { AuthSigninPostBody, AuthSigninPostResponse } from '.';
import { verifyPassword } from '$lib/auth/password';
import { signAccessToken, signRefreshToken, generateRandomToken } from '$lib/auth/jwt';
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

		// 4. Generate tokens
		const accessToken = await signAccessToken({
			userId: user.id,
			roleId: user.roleId
		});

		const tokenId = crypto.randomUUID();
		const storedToken = generateRandomToken();

		// Calculate expiry (7 days from now)
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 7);

		// 5. Store refresh token in database
		await db.insert(refreshTokens).values({
			id: tokenId,
			userId: user.id,
			token: storedToken,
			expiresAt
		});

		// 6. Sign refresh token JWT (contains tokenId for revocation lookup)
		const refreshToken = await signRefreshToken({
			userId: user.id,
			tokenId
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
