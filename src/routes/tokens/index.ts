import { shariaStatusEnum, contentStatusEnum } from '$lib/db/tables';
import { zQueryArray } from '$lib/utils';
import OpenApiResponse from '$lib/openapi-response';
import { Token } from '$lib/db/types';
import { PaginatedData, UserMetadata } from '$lib/types';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import z from '$lib/zod-openapi';

/**
 * Zod schema for validating token query parameters.
 */
export const TokensGetQuery = z
	.object({
		statuses: zQueryArray(z.enum(contentStatusEnum.enumValues), {
			description: 'List of content statuses to filter by.<br>Example: published,draft'
		}).default(['published']),
		shariaStatuses: zQueryArray(z.enum(shariaStatusEnum.enumValues), {
			description: 'List of sharia statuses to filter by.<br>Example: halal,haram'
		}),
		slugs: zQueryArray(z.string(), {
			description: 'List of token slugs to filter by.<br>Example: bitcoin,ethereum,sui'
		}),
		exclude: zQueryArray(z.string(), {
			description: 'List of token slugs to exclude.<br>Example: bitcoin,ethereum,sui'
		}),
		search: z.string().optional(),
		limit: z.coerce.number().min(1).max(100).default(10),
		page: z.coerce.number().min(1).default(1)
	})
	.openapi('TokensGetQuery', {
		description: 'Query parameters for fetching tokens with filtering, searching, and pagination'
	});

export const TokensGetItem = Token.omit({
	content: true
})
	.extend({
		createdBy: UserMetadata.nullable(),
		updatedBy: UserMetadata.nullable()
	})
	.openapi('TokensGetItem');
export type TokensGetItem = z.infer<typeof TokensGetItem>;

export const tokensGet: RouteConfig = {
	path: '/tokens',
	method: 'get',
	summary: 'List Tokens',
	description:
		'Retrieve a list of cryptocurrency tokens with filtering, searching, and pagination support.',
	request: {
		query: TokensGetQuery
	},
	responses: {
		...OpenApiResponse.ok(PaginatedData(TokensGetItem, 'TokensGetItem')),
		...OpenApiResponse.badRequest(),
		...OpenApiResponse.unauthorized(),
		...OpenApiResponse.internalServerError()
	},
	security: [{ ApiKeyAuth: [] }]
};
