import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import z from '$lib/zod-openapi';

export const openapiGet: RouteConfig = {
	path: '/openapi.json',
	method: 'get',
	summary: 'OpenAPI Spec',
	description: 'Retrieve the OpenAPI 3.1.0 specification for this API.',
	responses: {
		200: {
			description: 'OpenAPI Specification in JSON',
			content: {
				'application/json': {
					schema: z.object({})
				}
			}
		}
	}
};
