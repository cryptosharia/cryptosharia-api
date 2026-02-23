import { OpenApiResponse } from '$lib/api';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';

export const seedDemoPost: RouteConfig = {
	path: '/seed/demo',
	method: 'post',
	summary: 'Seed Demo Data',
	description:
		'Initialize the database with sample data (Users, Posts, Tokens, Messages) for development and testing. **WARNING: This will wipe out all existing data.**',
	responses: {
		...OpenApiResponse.created(undefined, 'Demo data seeded successfully'),
		...OpenApiResponse.forbidden('Demo seeding is strictly forbidden in production'),
		...OpenApiResponse.internalServerError('Failed to seed demo data')
	},
	security: [{ ApiKeyAuth: [] }]
};

export const seedRoutes: RouteConfig[] = [seedDemoPost];
