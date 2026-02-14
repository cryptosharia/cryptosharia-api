import { env } from '$env/dynamic/private';
import { ApiResponse } from '$lib/api';
import type { Handle } from '@sveltejs/kit';
import { verifyAccessToken } from '$lib/auth/tokens';
import { getUserPermissions } from '$lib/auth/permissions';
import type { Role } from '$lib/auth/rbac';

// Cache valid API keys at module load (not per-request)
const validApiKeys = Object.entries(env)
	.filter(([key]) => key.startsWith('CS_API_KEY_'))
	.map(([, value]) => value);

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	// 1. Exemptions (Documentation & OpenAPI Spec)
	const publicPaths = ['/', '/openapi.json'];
	if (publicPaths.includes(pathname)) {
		return resolve(event);
	}

	// 2. Check for Api-Key header (Mandatory for all 1st party platforms)
	const apiKey = event.request.headers.get('Api-Key');

	if (!apiKey || !validApiKeys.includes(apiKey)) {
		return ApiResponse.unauthorized();
	}

	// 3. Extract and verify JWT if present in Authorization header
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

	// 4. Continue to the request handler
	const response = await resolve(event);

	// 5. Inject Security Headers

	// Prevents Clickjacking by forbidding the page from being embedded in frames/iframes.
	response.headers.set('X-Frame-Options', 'DENY');

	// Prevents the browser from 'guessing' the file type (MIME sniffing),
	// forcing it to use the exact Content-Type defined by the server.
	response.headers.set('X-Content-Type-Options', 'nosniff');

	// Protects privacy by hiding the full URL path when navigating to other sites,
	// only sending the domain (origin) for cross-origin requests.
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

	// Enables the browser's built-in XSS filter and instructs it to block
	// the entire page if a cross-site scripting attack is detected.
	response.headers.set('X-XSS-Protection', '1; mode=block');

	// Content Security Policy (CSP) Report-Only mode.
	// This helps monitor potential XSS attacks and unauthorized resource loading
	// without breaking the application (useful for testing Scalar API docs).
	response.headers.set(
		'Content-Security-Policy-Report-Only',
		"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self';"
	);

	return response;
};
