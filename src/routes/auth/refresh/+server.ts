import type { RequestHandler } from './$types';
import { ApiResponse } from '$lib/api';
import { parseJsonBody } from '$lib/api/request';
import { AuthRefreshPostBody, AuthRefreshPostResponse } from '..';
import { rotateRefreshSession } from '$lib/services/auth-session';
import { logActivity } from '$lib/services/activity-logger';

/**
 * POST /auth/refresh
 * Rotate refresh token and issue new access token.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const parsedBody = await parseJsonBody(request, AuthRefreshPostBody);
	if (!parsedBody.ok) {
		return parsedBody.response;
	}

	const { refreshToken: oldToken } = parsedBody.data;

	try {
		const result = await rotateRefreshSession(oldToken);

		if (!result.ok && result.reason === 'invalid') {
			return ApiResponse.unauthorized('Invalid or expired refresh token');
		}

		if (!result.ok && result.reason === 'inactive') {
			return ApiResponse.forbidden('Your account is not active. Please contact support.');
		}

		await logActivity({
			userId: result.user.id,
			action: 'auth.refresh',
			subjectType: 'auth',
			description: 'Access and refresh tokens rotated',
			ipAddress: locals.clientIp
		});

		return ApiResponse.ok(
			AuthRefreshPostResponse.parse({
				user: result.user,
				accessToken: result.accessToken,
				refreshToken: result.refreshToken
			}),
			'Token refreshed successfully'
		);
	} catch (error) {
		console.error('Refresh error:', error);
		return ApiResponse.internalServerError('Failed to refresh authentication token');
	}
};
