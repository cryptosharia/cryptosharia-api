import 'fastify';
import type { User } from '#src/modules/drizzle/drizzle.types';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: User['id'];
      role: User['role'];
      permissions: string[];
    };
  }
}
