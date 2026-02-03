import { GetTokensParams } from '..';
import OpenApiResponse from '$lib/openapi-response';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import z from '$lib/zod-openapi';

export const GetTokensCountParams = GetTokensParams.pick({
	status: true,
	search: true
}).openapi('GetTokensCountParams', {
	description: 'Query parameters for counting tokens with filtering and searching'
});

export const tokensCountGet: RouteConfig = {
	path: '/tokens/count',
	method: 'get',
	summary: 'Count Tokens',
	description: 'Get the total count of tokens matching the specified criteria.',
	request: {
		query: GetTokensCountParams
	},
	responses: {
		...OpenApiResponse.ok(z.number().openapi({ example: 42 })),
		...OpenApiResponse.badRequest(),
		...OpenApiResponse.internalServerError()
	}
};
