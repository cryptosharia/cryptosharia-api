import { ApiResponse } from '$lib/types';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';

export const seed: RouteConfig = {
	path: '/seed',
	method: 'get',
	summary: 'Seed the database with dummy data (Development only)',
	responses: {
		200: {
			description: 'Database seeded successfully',
			content: {
				'application/json': {
					schema: ApiResponse
				}
			}
		},
		403: {
			description: 'Forbidden: Seeding is only allowed in development mode',
			content: {
				'application/json': {
					schema: ApiResponse
				}
			}
		},
		500: {
			description: 'Internal Server Error during seeding',
			content: {
				'application/json': {
					schema: ApiResponse
				}
			}
		}
	}
};
