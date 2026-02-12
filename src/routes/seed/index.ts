import OpenApiResponse from '$lib/openapi-response';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';

export const seedPost: RouteConfig = {
	path: '/seed',
	method: 'post',
	summary: 'Seed Sample Data',
	description:
		'Initialize the database with sample data for development and testing purposes. (Seeding in production is forbidden)',
	responses: {
		...OpenApiResponse.created(undefined, 'Database seeded successfully'),
		...OpenApiResponse.forbidden('Seeding in production is strictly forbidden'),
		...OpenApiResponse.unauthorized('Invalid or missing API key'),
		...OpenApiResponse.internalServerError(
			'Failed to seed database due to an internal server error'
		)
	},
	security: [{ ApiKeyAuth: [] }]
};
