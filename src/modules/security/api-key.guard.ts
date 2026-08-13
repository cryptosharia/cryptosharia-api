import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { getClientIp } from '#src/common/get-client-ip';
import { IS_PUBLIC_KEY } from '#src/common/public.decorator';
import {
  RateLimitService,
  type RateLimitResult,
} from '#src/modules/rate-limit/rate-limit.service';
import { RateLimitError } from '#src/modules/rate-limit/rate-limit.error';
import { TooManyRequestsException } from '#src/common/too-many-requests.exception';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    if (
      request.headers['api-key'] !== this.configService.getOrThrow('API_KEY')
    ) {
      throw new UnauthorizedException();
    }

    let result: RateLimitResult | undefined;
    try {
      result = await this.rateLimitService.check(getClientIp(request));
    } catch (error) {
      if (
        error instanceof RateLimitError &&
        error.code === 'RATE_LIMIT_PROVIDER_UNAVAILABLE'
      ) {
        throw new ServiceUnavailableException();
      }
      throw error;
    }
    if (!result) return true;

    const response = context.switchToHttp().getResponse<FastifyReply>();
    response.header('RateLimit-Limit', result.limit);
    response.header('RateLimit-Remaining', result.remaining);
    response.header('RateLimit-Reset', result.reset);
    if (!result.success) throw new TooManyRequestsException();
    return true;
  }
}
