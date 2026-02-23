import type { RouteConfig } from '@asteasolutions/zod-to-openapi';

export const docsGet: RouteConfig = {
	path: '/',
	method: 'get',
	summary: 'API Documentation',
	description: 'Documentation page for the CryptoSharia API using Scalar.',
	responses: {
		200: {
			description: 'API Documentation Page',
			content: {
				'text/html': {
					schema: { type: 'string' }
				}
			}
		}
	}
};

export const docsRoutes: RouteConfig[] = [docsGet];
