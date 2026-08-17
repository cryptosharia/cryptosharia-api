import 'fastify';
import type { CurrentUser } from '#src/modules/security/current-user.decorator';

// @nestjs/platform-fastify runs Nest middleware against req.raw (the raw
// IncomingMessage) via @fastify/middie, so BearerAuthMiddleware writes the
// resolved user there and guards/decorators read it from request.raw.
declare module 'node:http' {
  interface IncomingMessage {
    user?: CurrentUser | null;
  }
}
