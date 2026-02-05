import { shariaStatusEnum } from '$lib/db/tables';
import { zQueryArray } from '$lib/utils';
import OpenApiResponse from '$lib/openapi-response';
import { Token } from '$lib/db/types';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import z from '$lib/zod-openapi';

/**
 * Zod schema for validating token query parameters.
 */
export const GetTokensParams = z
	.object({
		'sharia-statuses': zQueryArray(z.enum(shariaStatusEnum.enumValues), {
			description: 'List of sharia statuses to filter by.<br>Example: halal,haram'
		}),
		slugs: zQueryArray(z.string(), {
			description: 'List of token slugs to filter by.<br>Example: bitcoin,ethereum,sui'
		}),
		search: z.string().optional(),
		limit: z.coerce.number().min(1).max(100).default(10),
		page: z.coerce.number().min(1).default(1),
		exclude: zQueryArray(z.string(), {
			description: 'List of token slugs to exclude.<br>Example: bitcoin,ethereum,sui'
		})
	})
	.openapi('GetTokensParams', {
		description: 'Query parameters for fetching tokens with filtering, searching, and pagination'
	});

export const tokensGet: RouteConfig = {
	path: '/tokens',
	method: 'get',
	summary: 'List Tokens',
	description:
		'Retrieve a list of cryptocurrency tokens with support for sharia status filtering, searching, and pagination.',
	request: {
		query: GetTokensParams
	},
	responses: {
		...OpenApiResponse.ok(z.array(Token).default([])),
		...OpenApiResponse.badRequest(),
		...OpenApiResponse.unauthorized(),
		...OpenApiResponse.internalServerError()
	},
	security: [{ ApiKeyAuth: [] }]
};
