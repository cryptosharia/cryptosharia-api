import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { User } from '#src/modules/drizzle/drizzle.types';
import type { Permission } from './permissions';

export type CurrentUser = {
  id: User['id'];
  role: User['role'];
  permissions: Permission[];
};

export const CurrentUser = createParamDecorator(
  (_, context: ExecutionContext): CurrentUser | null => {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    // BearerAuthMiddleware (run by @fastify/middie) resolves the user on
    // req.raw, the raw IncomingMessage, not on the FastifyRequest wrapper.
    return request.raw.user ?? null;
  },
);
