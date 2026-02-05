import OpenApiResponse from '$lib/openapi-response';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';

export const seedPost: RouteConfig = {
	path: '/seed',
	method: 'post',
	summary: 'Seed Sample Data',
	description:
		'Initialize the database with sample data for development and testing purposes. (Seeding in production is forbidden)',
	responses: {
		...OpenApiResponse.created(),
		...OpenApiResponse.forbidden(),
		...OpenApiResponse.unauthorized(),
		...OpenApiResponse.internalServerError()
	},
	security: [{ ApiKeyAuth: [] }]
};
