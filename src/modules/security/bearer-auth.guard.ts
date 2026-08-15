import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { ACCESS_TOKEN_ISSUER } from '#src/modules/auth/auth.constants';
import { CryptoService } from '#src/modules/crypto/crypto.service';
import { ROLE_PERMISSIONS } from './permissions';
import type { User } from '#src/modules/drizzle/drizzle.types';

type AccessTokenPayload = { userId: User['id']; role: User['role'] };

@Injectable()
export class BearerAuthGuard implements CanActivate {
  constructor(private readonly cryptoService: CryptoService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer '))
      throw new UnauthorizedException();

    try {
      // Reject otherwise valid JWTs minted for a different issuer or application boundary.
      const payload = await this.cryptoService.verifyJwt<AccessTokenPayload>(
        authorization.slice('Bearer '.length),
        { issuer: ACCESS_TOKEN_ISSUER },
      );
      if (!payload.userId || !ROLE_PERMISSIONS[payload.role]) {
        throw new UnauthorizedException();
      }

      // Permission snapshots in short-lived access tokens avoid a user lookup on every request.
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
