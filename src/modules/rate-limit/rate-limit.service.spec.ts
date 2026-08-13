import { describe, expect, it, vi } from 'vitest';
import { RateLimitError } from './rate-limit.error';
import { RateLimitService } from './rate-limit.service';

describe('RateLimitService', () => {
  it.each(['development', 'test'])(
    'disables rate limiting in %s',
    async (nodeEnv) => {
      const configService = {
        get: vi.fn().mockReturnValue(nodeEnv),
        getOrThrow: vi.fn(),
      };
      const service = new RateLimitService(configService as never);

      await expect(service.check('127.0.0.1')).resolves.toBeUndefined();
      expect(configService.getOrThrow).not.toHaveBeenCalled();
    },
  );

  it('fails closed when the production provider is unavailable', async () => {
    const configService = {
      get: vi.fn().mockReturnValue('test'),
      getOrThrow: vi.fn(),
    };
    const service = new RateLimitService(configService as never);
    Object.assign(service, {
      limiter: { limit: vi.fn().mockRejectedValue(new Error('Unavailable')) },
    });

    await expect(service.check('127.0.0.1')).rejects.toBeInstanceOf(
      RateLimitError,
    );
  });
});
