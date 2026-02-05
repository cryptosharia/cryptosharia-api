import { env } from '$env/dynamic/private';
import ApiResponse from '$lib/api-response';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	// 1. Exemptions (Documentation & OpenAPI Spec)
	const publicPaths = ['/', '/openapi.json'];
	if (publicPaths.includes(pathname)) {
		return resolve(event);
	}

	// 2. Identify all valid API Keys from .env
	// Keys must start with CS_API_KEY_
	const validApiKeys = Object.entries(env)
		.filter(([key]) => key.startsWith('CS_API_KEY_'))
		.map(([, value]) => value);

	// 3. Check for Api-Key header
	const apiKey = event.request.headers.get('Api-Key');

	if (!apiKey || !validApiKeys.includes(apiKey)) {
		return ApiResponse.unauthorized();
	}

	// 4. Continue to the request handler
	return resolve(event);
};
