import { OpenApiGeneratorV31, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { posts } from '../posts';
import { postsCount } from '../posts/count';
import { tokens } from '../tokens';
import { tokensCount } from '../tokens/count';
import { messages } from '../messages';
import { seed } from '../seed';

const PATHS = [posts, postsCount, tokens, tokensCount, messages, seed];

export function GET() {
	const registry = new OpenAPIRegistry();

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
			version: '1.0.0',
			description: 'API for CryptoSharia'
		}
	});

	return Response.json(openapi);
}
