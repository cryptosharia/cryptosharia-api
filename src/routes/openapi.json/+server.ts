import { OpenApiGeneratorV31, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { posts } from '../posts';

export function GET() {
	const registry = new OpenAPIRegistry();

	// Register paths
	registry.registerPath(posts);

	const generator = new OpenApiGeneratorV31(registry.definitions);

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
