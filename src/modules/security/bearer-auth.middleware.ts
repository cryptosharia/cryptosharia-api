import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ACCESS_TOKEN_ISSUER } from '#src/modules/auth/auth.constants';
import { CryptoService } from '#src/modules/crypto/crypto.service';
import { ROLE_PERMISSIONS } from './permissions';
import type { CurrentUser } from './current-user.decorator';
import type { User } from '#src/modules/drizzle/drizzle.types';

type AccessTokenPayload = { sub: User['id']; role: User['role'] };

@Injectable()
export class BearerAuthMiddleware implements NestMiddleware {
  constructor(private readonly cryptoService: CryptoService) {}

  // @nestjs/platform-fastify runs Nest middleware against the raw
  // IncomingMessage/ServerResponse (via @fastify/middie), not the Fastify
  // wrappers, so type the params as the raw objects.
  async use(
    request: FastifyRequest['raw'],
    _response: FastifyReply['raw'],
    next: () => void,
  ): Promise<void> {
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      request.user = null;
      return next();
    }

    try {
      const payload = await this.cryptoService.verifyJwt<AccessTokenPayload>(
        authorization.slice('Bearer '.length),
        { issuer: ACCESS_TOKEN_ISSUER },
      );
      request.user =
        payload.sub && ROLE_PERMISSIONS[payload.role]
          ? ({
              id: payload.sub,
              role: payload.role,
              permissions: ROLE_PERMISSIONS[payload.role],
            } satisfies CurrentUser)
          : null;
    } catch {
      // An invalid or expired bearer on an optional read is treated as a guest.
      request.user = null;
    }
    return next();
  }
}
