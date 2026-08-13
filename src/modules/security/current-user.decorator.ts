import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { User } from '#src/modules/drizzle/drizzle.types';
import type { Permission } from './permissions';

export type CurrentUser = {
  id: User['id'];
  role: User['role'];
  permissions: Permission[];
};

export const CurrentUser = createParamDecorator(
  (_, context: ExecutionContext): CurrentUser => {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    if (!request.user) throw new UnauthorizedException();
    return request.user;
  },
);
