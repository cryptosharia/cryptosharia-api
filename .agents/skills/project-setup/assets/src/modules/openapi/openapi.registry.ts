import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { usersRouteConfig } from '#src/modules/users/users.openapi';

export function generateOpenApiDocument({ title, description }: { title: string; description: string }) {
  const registry = new OpenAPIRegistry();

  registry.registerComponent('securitySchemes', 'BearerAuth', {
    type: 'http', scheme: 'bearer', bearerFormat: 'JWT',
    description: 'JWT access token obtained after authentication. Include as: Authorization: Bearer <token>',
  });

  const routes = [...usersRouteConfig];
  for (const route of routes) registry.registerPath(route);

  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: '3.1.0',
    info: {
      version: '1.0.0',
      title: '<App Name>',
      description: 'OpenAPI specification for the <App Name>.',
    },
  });
}
