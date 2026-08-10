import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { getClientIp } from './common/get-client-ip';
import { IS_PUBLIC_KEY } from './common/public.decorator';
import { TooManyRequestsException } from './common/too-many-requests.exception';

@Injectable()
export class ApiGuard implements CanActivate {
  private readonly logger = new Logger(ApiGuard.name);
  private readonly limiter: Ratelimit | undefined;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    if (configService.get<string>('NODE_ENV') !== 'production') return;

    this.limiter = new Ratelimit({
      redis: new Redis({
        url: configService.getOrThrow<string>('KV_REST_API_URL'),
        token: configService.getOrThrow<string>('KV_REST_API_TOKEN'),
      }),
      limiter: Ratelimit.slidingWindow(100, '60 s'),
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const apiKey = request.headers['api-key'];
    const expectedApiKey = this.configService.getOrThrow<string>('API_KEY');

    if (typeof apiKey !== 'string' || apiKey !== expectedApiKey) {
      throw new UnauthorizedException();
    }

    if (!(await this.isWithinLimit(getClientIp(request)))) {
      throw new TooManyRequestsException();
    }

    return true;
  }

  private async isWithinLimit(identifier: string): Promise<boolean> {
    if (!this.limiter) return true;

    try {
      const result = await this.limiter.limit(identifier);
      return result.success;
    } catch (error) {
      this.logger.error('Rate limiter unavailable', error);
      return true;
    }
  }
}
