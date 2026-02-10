import { Token } from '$lib/db/types';
import { UserMetadata } from '$lib/types';
import OpenApiResponse from '$lib/openapi-response';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import z from '$lib/zod-openapi';

export const TokensGetData = Token.extend({
	createdBy: UserMetadata.nullable(),
	updatedBy: UserMetadata.nullable()
}).openapi('TokensGetData');
export type TokensGetData = z.infer<typeof TokensGetData>;

export const TokensSlugGetParams = z
	.object({
		slug: z.string().describe('The slug of the cryptocurrency token')
	})
	.openapi('TokensSlugGetParams');

export const tokensSlugGet: RouteConfig = {
	path: '/tokens/{slug}',
	method: 'get',
	summary: 'Get Published Token by Slug',
	description: 'Retrieve a single published cryptocurrency token using its slug.',
	request: {
		params: TokensSlugGetParams
	},
	responses: {
		...OpenApiResponse.ok(TokensGetData),
		...OpenApiResponse.notFound(),
		...OpenApiResponse.unauthorized(),
		...OpenApiResponse.internalServerError()
	},
	security: [{ ApiKeyAuth: [] }]
};
