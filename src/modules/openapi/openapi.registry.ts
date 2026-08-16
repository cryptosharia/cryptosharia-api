import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
} from '@asteasolutions/zod-to-openapi';
import { usersRouteConfig } from '#src/modules/users/users.openapi';
import { systemRouteConfig } from '#src/modules/system/system.openapi';
import { authRouteConfig } from '#src/modules/auth/auth.openapi';
import { assetsRouteConfig } from '#src/modules/assets/assets.openapi';

export function generateOpenApiDocument() {
  const registry = new OpenAPIRegistry();

  registry.registerComponent('securitySchemes', 'BearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description:
      'JWT access token obtained after authentication. Include as: authorization: Bearer <token>',
  });

  registry.registerComponent('securitySchemes', 'ApiKeyAuth', {
    type: 'apiKey',
    in: 'header',
    name: 'api-key',
    description:
      'API key required by protected routes. Include as: api-key: <key>',
  });

  const routes = [
    ...systemRouteConfig,
    ...authRouteConfig,
    ...usersRouteConfig,
    ...assetsRouteConfig,
  ];
  for (const route of routes) registry.registerPath(route);

  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: '3.1.0',
    info: {
      version: '1.1.0',
      title: 'Cryptosharia API',
      description:
        'OpenAPI specification for the Cryptosharia API.<br>Go to <a href="/openapi.json">openapi.json</a> or <a href="/openapi.yaml">openapi.yaml</a> for the raw specification.',
    },
  });
}
