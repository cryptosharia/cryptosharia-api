import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    // BearerAuthMiddleware (run by @fastify/middie) resolves the user on
    // req.raw, the raw IncomingMessage, not on the FastifyRequest wrapper.
    if (!request.raw.user) throw new UnauthorizedException();
    return true;
  }
}
