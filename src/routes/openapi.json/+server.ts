import type { RequestHandler } from './$types';
import { OpenApiGeneratorV31, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { postsGet, postsDetailGet } from '../posts';
import { tokensGet, tokensDetailGet, tokensQuotesGet } from '../tokens';
import { messagesGet, messagesPost } from '../messages';
import { seedDemoPost } from '../seed';
import { imgbbPost } from '../imgbb';
import { openapiGet } from '.';
import { docsGet } from '../(docs)';
import {
	authMeGet,
	authRefreshPost,
	authSigninPost,
	authSignoutPost,
	authSignupPost,
	authVerifyPost
} from '../auth';
import { usersGet, usersIdGet, usersIdPatch, usersIdStatusPut, usersIdRolePut } from '../users';

const PATHS = [
	docsGet,
	openapiGet,
	authSignupPost,
	authVerifyPost,
	authSigninPost,
	authSignoutPost,
	authRefreshPost,
	authMeGet,
	usersGet,
	usersIdGet,
	usersIdPatch,
	usersIdStatusPut,
	usersIdRolePut,
	postsGet,
	postsDetailGet,
	tokensGet,
	tokensDetailGet,
	tokensQuotesGet,
	messagesGet,
	messagesPost,
	imgbbPost,
	seedDemoPost
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
