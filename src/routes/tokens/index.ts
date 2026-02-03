import { tokenStatus } from '$lib/db/tables';
import { ApiResponse, Token } from '$lib/types';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import z from '$lib/zod-openapi';

/**
 * Zod schema for validating token query parameters.
 * - status: 'halal', 'haram', 'syubhat', or 'all'
 * - search: optional string
 * - limit: range 1-100, defaults to 10
 * - page: minimum 1, defaults to 1
 */
export const GetTokensParams = z
	.object({
		status: z.enum(['all', ...tokenStatus.enumValues]).default('all'),
		slug: z.string().optional(),
		search: z.string().optional(),
		limit: z.coerce.number().min(1).max(100).default(10),
		page: z.coerce.number().min(1).default(1),
		exclude: z.string().optional().openapi({
			description: 'Comma-separated list of token slugs to exclude',
			example: 'bitcoin,ethereum,sui'
		})
	})
	.openapi('GetTokensParams', {
		description: 'Query parameters for fetching tokens with filtering, searching, and pagination'
	});

export const tokens: RouteConfig = {
	path: '/tokens',
	method: 'get',
	summary: 'Fetch tokens with filtering, searching, and pagination',
	request: {
		query: GetTokensParams
	},
	responses: {
		200: {
			description: 'Success',
			content: {
				'application/json': {
					schema: ApiResponse.extend({
						data: z.array(Token).default([])
					})
				}
			}
		},
		400: {
			description: 'Bad Request',
			content: {
				'application/json': {
					schema: ApiResponse
				}
			}
		}
	}
};
