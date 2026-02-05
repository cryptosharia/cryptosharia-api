import type { RequestHandler } from './$types';
import { OpenApiGeneratorV31, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { postsGet } from '../posts';
import { postsCountGet } from '../posts/count';
import { tokensGet } from '../tokens';
import { tokensCountGet } from '../tokens/count';
import { tokensQuotesGet } from '../tokens/quotes';
import { messagesGet, messagesPost } from '../messages';
import { seedGet } from '../seed';
import { openapiGet } from '.';
import { docsGet } from '../(docs)';

const PATHS = [
	docsGet,
	openapiGet,
	postsGet,
	postsCountGet,
	tokensGet,
	tokensCountGet,
	tokensQuotesGet,
	messagesGet,
	messagesPost,
	seedGet
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
				'API for CryptoSharia Ecosystem<br>Open API Spec: <a href="/openapi.json">openapi.json</a>'
		}
	});

	return Response.json(openapi);
};
