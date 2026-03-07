import { env } from '$env/dynamic/private';
import { CS_API_KEY_OPS } from '$env/static/private';
import { ApiResponse } from '$lib/api';
import type { Handle } from '@sveltejs/kit';
import { verifyAccessToken } from '$lib/auth/tokens';
import { getUserPermissions } from '$lib/auth/permissions';
import type { Role } from '$lib/auth/rbac';
import { defaultLimiter } from '$lib/api/ratelimit';
import { parseForwardedIp } from '$lib/api/trust-boundary';

// Cache valid API keys at module load (not per-request)
const validApiKeys = Object.entries(env)
	.filter(([key]) => key.startsWith('CS_API_KEY_'))
	.map(([, value]) => value);

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	const apiKey = event.request.headers.get('Api-Key');
	const publicPaths = ['/', '/openapi.json'];
	const isOpsPath = pathname.startsWith('/ops/');
	event.locals.clientIp = event.getClientAddress();

	const withSecurityHeaders = (response: Response) => {
		response.headers.set('X-Frame-Options', 'DENY');
		response.headers.set('X-Content-Type-Options', 'nosniff');
		response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
		response.headers.set('X-XSS-Protection', '1; mode=block');
		response.headers.set(
			'Content-Security-Policy-Report-Only',
			"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self';"
		);
		return response;
	};

	// 1. Public Exemptions (No Rate Limiting)
	if (publicPaths.includes(pathname)) {
		return withSecurityHeaders(await resolve(event));
	}

	// 2. Ops path auth gate (requires dedicated ops Api-Key)
	if (isOpsPath && apiKey !== CS_API_KEY_OPS) {
		return withSecurityHeaders(ApiResponse.unauthorized());
	}

	// 3. Check for Api-Key header (Mandatory for all non-public/private API routes)
	if (!isOpsPath && (!apiKey || !validApiKeys.includes(apiKey))) {
		return withSecurityHeaders(ApiResponse.unauthorized());
	}

	// 4. Private/Ops Rate Limiting (after auth validation)
	event.locals.clientIp =
		parseForwardedIp(event.request.headers.get('Forwarded')) || event.getClientAddress();
	const rl = await defaultLimiter.consume(event.locals.clientIp);

	const withPrivateRateLimit = (response: Response) => {
		response.headers.set('RateLimit-Limit', rl.limit.toString());
		response.headers.set('RateLimit-Remaining', rl.remaining.toString());
		response.headers.set('RateLimit-Reset', rl.reset.toString());
		return withSecurityHeaders(response);
	};

	if (!rl.success) {
		return withPrivateRateLimit(ApiResponse.tooManyRequests());
	}

	// 5. Extract and verify JWT if present in Authorization header
	const authHeader = event.request.headers.get('Authorization');
	if (authHeader && authHeader.startsWith('Bearer ')) {
		const token = authHeader.split(' ')[1];
		try {
			const payload = await verifyAccessToken(token);

			// Fetch permissions for the assigned role
			const permissions = getUserPermissions(payload.role as Role);

			event.locals.user = {
				id: payload.userId,
				role: payload.role as Role,
				permissions
			};
		} catch {
			// Token exists but is invalid/expired. We don't block yet,
			// individual routes decide if they require auth
		}
	}

	// 6. Continue to the request handler
	const response = await resolve(event);

	return withPrivateRateLimit(response);
};
