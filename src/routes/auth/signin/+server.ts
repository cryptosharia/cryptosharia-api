import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { users, refreshTokens } from '$lib/db/tables';
import { eq } from 'drizzle-orm';
import { ApiResponse } from '$lib/api';
import { parseJsonBody } from '$lib/api/request';
import { AuthSigninPostBody, AuthSigninPostResponse } from '..';
import { verifyPassword, needsRehash, hashPassword } from '$lib/auth/password';
import { signAccessToken, createRefreshToken } from '$lib/auth/tokens';
import { logActivity } from '$lib/services/activity-logger';

/**
 * POST /auth/signin
 * Authenticate user with email and password.
 */
export const POST: RequestHandler = async (event) => {
	const { request } = event;
	const parsedBody = await parseJsonBody(request, AuthSigninPostBody);
	if (!parsedBody.ok) {
		return parsedBody.response;
	}

	const { email, password } = parsedBody.data;

	try {
		const user = await db.query.users.findFirst({
			where: eq(users.email, email)
		});

		if (!user || !user.isEmailVerified) {
			return ApiResponse.unauthorized('Invalid email or password');
		}

		if (user.status !== 'active') {
			return ApiResponse.forbidden('Your account is not active. Please contact support.');
		}

		const isValid = await verifyPassword(password, user.hashedPassword);
		if (!isValid) {
			return ApiResponse.unauthorized('Invalid email or password');
		}

		if (needsRehash(user.hashedPassword)) {
			const newHash = await hashPassword(password);
			await db.update(users).set({ hashedPassword: newHash }).where(eq(users.id, user.id));
		}

		await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

		const accessToken = await signAccessToken({
			userId: user.id,
			role: user.role
		});

		const refreshToken = createRefreshToken(user.id);
		await db.insert(refreshTokens).values(refreshToken);

		const ipAddress = event.locals.clientIp;
		await logActivity({
			userId: user.id,
			action: 'signin',
			subjectType: 'auth',
			ipAddress
		});

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
