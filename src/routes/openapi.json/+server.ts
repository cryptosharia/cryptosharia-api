import type { RequestHandler } from './$types';
import { OpenApiGeneratorV31, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { postsGet } from '../posts';
import { postsIdGet } from '../posts/[id=uuid]';
import { postsSlugGet } from '../posts/[slug]';
import { tokensGet } from '../tokens';
import { tokensIdGet } from '../tokens/[id=uuid]';
import { tokensSlugGet } from '../tokens/[slug]';
import { tokensQuotesGet } from '../tokens/quotes';
import { messagesGet, messagesPost } from '../messages';
import { seedPost } from '../seed';
import { imgbbPost } from '../imgbb';
import { openapiGet } from '.';
import { docsGet } from '../(docs)';
import { authSigninPost } from '../auth/signin';
import { authSignoutPost } from '../auth/signout';
import { authRefreshPost } from '../auth/refresh';
import { authMeGet } from '../auth/me';

const PATHS = [
	docsGet,
	openapiGet,
	authSigninPost,
	authSignoutPost,
	authRefreshPost,
	authMeGet,
	postsGet,
	postsIdGet,
	postsSlugGet,
	tokensGet,
	tokensIdGet,
	tokensSlugGet,
	tokensQuotesGet,
	messagesGet,
	messagesPost,
	imgbbPost,
	seedPost
];

export const GET: RequestHandler = async () => {
	const registry = new OpenAPIRegistry();

	// Register security scheme
	registry.registerComponent('securitySchemes', 'ApiKeyAuth', {
		type: 'apiKey',
		in: 'header',
		name: 'Api-Key',
		description: 'API Key for authenticated access to CryptoSharia Ecosystem services.'
	});
	registry.registerComponent('securitySchemes', 'BearerAuth', {
		type: 'http',
		scheme: 'bearer',
		bearerFormat: 'JWT',
		description: 'JWT Bearer token for user authentication.'
	});

	// Register paths
	for (const path of PATHS) {
		registry.registerPath(path);
	}

	const generator = new OpenApiGeneratorV31(registry.definitions);

	// Generate OpenAPI document
	const openapi = generator.generateDocument({
		openapi: '3.1.0',
		info: {
			title: 'CryptoSharia API',
			version: '',
			description:
				'API for CryptoSharia Ecosystem<br>OpenAPI Spec: <a href="/openapi.json">openapi.json</a>'
		}
	});

	return Response.json(openapi);
};
