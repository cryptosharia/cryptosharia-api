import OpenApiResponse from '$lib/openapi-response';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';

export const seedGet: RouteConfig = {
	path: '/seed',
	method: 'get',
	summary: 'Seed Sample Data',
	description:
		'Initialize the database with sample data for development and testing purposes. (Seeding in production is forbidden)',
	responses: {
		...OpenApiResponse.ok(),
		...OpenApiResponse.forbidden(),
		...OpenApiResponse.internalServerError()
	}
};
