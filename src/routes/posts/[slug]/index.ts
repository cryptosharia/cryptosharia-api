import { Post } from '$lib/db/types';
import { UserMetadata, AssetMetadata } from '$lib/types';
import OpenApiResponse from '$lib/openapi-response';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import z from '$lib/zod-openapi';

export const PostsGetData = Post.omit({
	coverImageId: true
}).extend({
	createdBy: UserMetadata.nullable(),
	updatedBy: UserMetadata.nullable(),
	coverImage: AssetMetadata.nullable()
}).openapi('PostsGetData');
export type PostsGetData = z.infer<typeof PostsGetData>;

export const PostsSlugGetParams = z
	.object({
		slug: z.string().describe('The slug of the post')
	})
	.openapi('PostsSlugGetParams');

export const postsSlugGet: RouteConfig = {
	path: '/posts/{slug}',
	method: 'get',
	summary: 'Get Published Post by Slug',
	description: 'Retrieve a single published post using its slug.',
	request: {
		params: PostsSlugGetParams
	},
	responses: {
		...OpenApiResponse.ok(PostsGetData),
		...OpenApiResponse.notFound(),
		...OpenApiResponse.unauthorized(),
		...OpenApiResponse.internalServerError()
	},
	security: [{ ApiKeyAuth: [] }]
};
