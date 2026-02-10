import { TokensGetData } from '../[slug]';
import OpenApiResponse from '$lib/openapi-response';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import z from '$lib/zod-openapi';

export const TokensIdGetParams = z
	.object({
		id: z.uuid().describe('The UUID of the cryptocurrency token')
	})
	.openapi('TokensIdGetParams');

export const tokensIdGet: RouteConfig = {
	path: '/tokens/{id}',
	method: 'get',
	summary: 'Get Token by ID',
	description: 'Retrieve any cryptocurrency token using its UUID regardless of its status.',
	request: {
		params: TokensIdGetParams
	},
	responses: {
		...OpenApiResponse.ok(TokensGetData),
		...OpenApiResponse.notFound(),
		...OpenApiResponse.unauthorized(),
		...OpenApiResponse.internalServerError()
	},
	security: [{ ApiKeyAuth: [] }]
};
