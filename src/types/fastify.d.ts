import 'fastify';
import type { CurrentUser } from '#src/modules/security/current-user.decorator';

declare module 'fastify' {
  interface FastifyRequest {
    user?: CurrentUser;
  }
}
