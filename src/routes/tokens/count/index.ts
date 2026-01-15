import { GetTokensParams } from '..';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import z from '$lib/zod-openapi';
import { ApiResponse } from '$lib/types';

export const GetTokensCountParams = GetTokensParams.pick({
	status: true,
	search: true
}).openapi('GetTokensCountParams', {
	description: 'Query parameters for counting tokens with filtering and searching'
});

export const tokensCount: RouteConfig = {
	path: '/tokens/count',
	method: 'get',
	summary: 'Get the total number of tokens matching the filters',
	request: {
		query: GetTokensCountParams
	},
	responses: {
		200: {
			description: 'Success',
			content: {
				'application/json': {
					schema: ApiResponse.extend({
						data: z.number().openapi({ example: 42 })
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
