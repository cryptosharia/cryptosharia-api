import {
  OpenAPIRegistry,
  OpenApiGeneratorV32,
} from '@asteasolutions/zod-to-openapi';
import { usersRouteConfig } from '#src/modules/users/users.openapi';
import { systemRouteConfig } from '#src/modules/system/system.openapi';
import { authRouteConfig } from '#src/modules/auth/auth.openapi';
import { assetsRouteConfig } from '#src/modules/assets/assets.openapi';
import { tagsRouteConfig } from '#src/modules/tags/tags.openapi';
import { messagesRouteConfig } from '#src/modules/messages/messages.openapi';
import { postsRouteConfig } from '#src/modules/posts/posts.openapi';
import { tokensRouteConfig } from '#src/modules/tokens/tokens.openapi';

export function generateOpenApiDocument() {
  const registry = new OpenAPIRegistry();

  registry.registerComponent('securitySchemes', 'BearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description:
      'Token akses JWT yang diperoleh setelah autentikasi. Sertakan sebagai: authorization: Bearer <token>',
  });

  registry.registerComponent('securitySchemes', 'ApiKeyAuth', {
    type: 'apiKey',
    in: 'header',
    name: 'api-key',
    description:
      'API key yang dibutuhkan oleh route yang dilindungi. Sertakan sebagai: api-key: <key>',
  });

  const routes = [
    ...systemRouteConfig,
    ...authRouteConfig,
    ...usersRouteConfig,
    ...tagsRouteConfig,
    ...postsRouteConfig,
    ...tokensRouteConfig,
    ...messagesRouteConfig,
    ...assetsRouteConfig,
  ];
  for (const route of routes) registry.registerPath(route);

  return new OpenApiGeneratorV32(registry.definitions).generateDocument({
    openapi: '3.2.0',
    info: {
      version: '1.1.0',
      title: 'Cryptosharia API',
      description:
        'Spesifikasi OpenAPI untuk Cryptosharia API.<br>Buka <a href="/openapi.json">openapi.json</a> atau <a href="/openapi.yaml">openapi.yaml</a> untuk spesifikasi mentah.',
    },
  });
}
