import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { RedisService } from '#src/modules/redis/redis.service';
import { RateLimitError } from './rate-limit.error';

export type RateLimitResult = {
  limit: number;
  remaining: number;
  reset: number;
  success: boolean;
};

// Redis server time keeps all application instances on the same clock. The sequence
// makes requests in the same millisecond distinct, and both keys expire together.
const SLIDING_WINDOW = `
local time = redis.call('TIME')
local now = time[1] * 1000 + math.floor(time[2] / 1000)
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - 60000)
local count = redis.call('ZCARD', KEYS[1])
local success = 0
if count < 100 then
  local sequence = redis.call('INCR', KEYS[2])
  redis.call('ZADD', KEYS[1], now, tostring(now) .. ':' .. tostring(sequence))
  count = count + 1
  success = 1
end
redis.call('PEXPIRE', KEYS[1], 60000)
redis.call('PEXPIRE', KEYS[2], 60000)
local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
return {100, 100 - count, tonumber(oldest[2]) + 60000, success}
`;

@Injectable()
export class RateLimitService {
  private readonly limiter: Ratelimit | undefined;
  private readonly useRedis: boolean;

  constructor(
    configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.useRedis =
      configService.get<string>('NODE_ENV') === 'production' &&
      configService.get<boolean>('SERVERLESS') !== true;
    // Local and test runs do not require external Upstash credentials or shared limits.
    if (configService.get<string>('NODE_ENV') !== 'production' || this.useRedis)
      return;

    this.limiter = new Ratelimit({
      redis: new Redis({
        url: configService.getOrThrow<string>('KV_REST_API_URL'),
        token: configService.getOrThrow<string>('KV_REST_API_TOKEN'),
      }),
      limiter: Ratelimit.slidingWindow(100, '60 s'),
    });
  }

  async check(identifier: string): Promise<RateLimitResult | undefined> {
    if (!this.limiter && !this.useRedis) return undefined;

    try {
      if (this.useRedis) {
        const digest = createHash('sha256').update(identifier).digest('hex');
        const key = `rate-limit:${digest}`;
        const result = await this.redisService.evalServerful(SLIDING_WINDOW, [
          key,
          `${key}:sequence`,
        ]);
        if (
          !Array.isArray(result) ||
          result.length !== 4 ||
          !result.every(
            (value) => typeof value === 'number' && Number.isSafeInteger(value),
          ) ||
          result[0] !== 100 ||
          result[1] < 0 ||
          result[1] > 100 ||
          result[2] <= 0 ||
          (result[3] !== 0 && result[3] !== 1)
        ) {
          throw new Error('Invalid rate limit response');
        }
        return {
          limit: result[0],
          remaining: result[1],
          reset: result[2],
          success: result[3] === 1,
        };
      }
      return await this.limiter!.limit(identifier);
    } catch {
      // A missing limit decision must deny the request rather than silently disabling protection.
      throw new RateLimitError('RATE_LIMIT_PROVIDER_UNAVAILABLE');
    }
  }
}
