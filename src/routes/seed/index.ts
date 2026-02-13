import OpenApiResponse from '$lib/openapi-response';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';

export const seedSystemPost: RouteConfig = {
	path: '/seed/system',
	method: 'post',
	summary: 'Seed System Data',
	description:
		'Initialize the database with core configuration (Roles and Permissions). Required for production readiness.',
	responses: {
		...OpenApiResponse.created(undefined, 'System configuration seeded successfully'),
		...OpenApiResponse.forbidden(
			'Seeding in production is strictly forbidden (unless configured otherwise)'
		),
		...OpenApiResponse.internalServerError('Failed to seed system configuration')
	},
	security: [{ ApiKeyAuth: [] }]
};

export const seedDemoPost: RouteConfig = {
	path: '/seed/demo',
	method: 'post',
	summary: 'Seed Demo Data',
	description:
		'Initialize the database with sample data (Users, Posts, Tokens, Messages) for development and testing. (Requires system seed to be run first)',
	responses: {
		...OpenApiResponse.created(undefined, 'Demo data seeded successfully'),
		...OpenApiResponse.forbidden('Demo seeding is strictly forbidden in production'),
		...OpenApiResponse.badRequest('Roles table is empty. Please run /seed/system first.'),
		...OpenApiResponse.internalServerError('Failed to seed demo data')
	},
	security: [{ ApiKeyAuth: [] }]
};
