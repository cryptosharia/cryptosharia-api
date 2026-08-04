import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import type { User } from '#src/modules/drizzle/drizzle.types';

export const CurrentUserId = createParamDecorator(
  (_, ctx: ExecutionContext): User['id'] => {
    const req: FastifyRequest = ctx.switchToHttp().getRequest();
    if (!req.user) throw new UnauthorizedException();
    return req.user.id;
  },
);
