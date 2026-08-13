import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { FastifyRequest } from 'fastify';
import { ROLE_PERMISSIONS } from './permissions';
import type { User } from '#src/modules/drizzle/drizzle.types';

type AccessTokenPayload = { userId: User['id']; role: User['role'] };

@Injectable()
export class BearerAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer '))
      throw new UnauthorizedException();

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        authorization.slice('Bearer '.length),
        { issuer: 'api.cryptosharia.id' },
      );
      if (!payload.userId || !ROLE_PERMISSIONS[payload.role]) {
        throw new UnauthorizedException();
      }

      request.user = {
        id: payload.userId,
        role: payload.role,
        permissions: ROLE_PERMISSIONS[payload.role],
      };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException();
    }
  }
}
