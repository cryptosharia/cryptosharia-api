import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { RateLimitError } from './rate-limit.error';

export type RateLimitResult = {
  limit: number;
  remaining: number;
  reset: number;
  success: boolean;
};

@Injectable()
export class RateLimitService {
  private readonly limiter: Ratelimit | undefined;

  constructor(configService: ConfigService) {
    // Local and test runs do not require external Upstash credentials or shared limits.
    if (configService.get<string>('NODE_ENV') !== 'production') return;

    this.limiter = new Ratelimit({
      redis: new Redis({
        url: configService.getOrThrow<string>('KV_REST_API_URL'),
        token: configService.getOrThrow<string>('KV_REST_API_TOKEN'),
      }),
      limiter: Ratelimit.slidingWindow(100, '60 s'),
    });
  }

  async check(identifier: string): Promise<RateLimitResult | undefined> {
    if (!this.limiter) return undefined;

    try {
      return await this.limiter.limit(identifier);
    } catch {
      // A missing limit decision must deny the request rather than silently disabling protection.
      throw new RateLimitError('RATE_LIMIT_PROVIDER_UNAVAILABLE');
    }
  }
}
