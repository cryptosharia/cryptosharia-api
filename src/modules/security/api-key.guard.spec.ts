import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { RateLimitError } from '#src/modules/rate-limit/rate-limit.error';
import { TooManyRequestsException } from '#src/common/too-many-requests.exception';
import { ApiKeyGuard } from './api-key.guard';

function createContext(options: { apiKey?: string; isPublic?: boolean }) {
  const headers = options.apiKey ? { 'api-key': options.apiKey } : {};
  const request = { headers, ip: '127.0.0.1' };
  const response = { header: vi.fn() };
  return {
    context: {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    },
    response,
  };
}

describe('ApiKeyGuard', () => {
  const createGuard = (isPublic: boolean) => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(isPublic),
    };
    const configService = { getOrThrow: vi.fn().mockReturnValue('valid-key') };
    const rateLimitService = { check: vi.fn().mockResolvedValue(undefined) };
    return {
      guard: new ApiKeyGuard(
        reflector as never,
        configService as never,
        rateLimitService as never,
      ),
      rateLimitService,
    };
  };

  it('allows an explicitly public route without an API key', async () => {
    const { context } = createContext({ isPublic: true });
    const { guard, rateLimitService } = createGuard(true);

    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    expect(rateLimitService.check).not.toHaveBeenCalled();
  });

  it('rejects a protected route without the configured API key', async () => {
    const { context } = createContext({});
    const { guard } = createGuard(false);

    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('checks the rate limit after a valid API key', async () => {
    const { context } = createContext({ apiKey: 'valid-key' });
    const { guard, rateLimitService } = createGuard(false);

    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    expect(rateLimitService.check).toHaveBeenCalledWith('127.0.0.1');
  });
  it('sets limit headers and rejects exhausted callers', async () => {
    const { context, response } = createContext({ apiKey: 'valid-key' });
    const { guard, rateLimitService } = createGuard(false);
    rateLimitService.check.mockResolvedValue({
      limit: 100,
      remaining: 0,
      reset: 12345,
      success: false,
    });
    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(
      TooManyRequestsException,
    );
    expect(response.header).toHaveBeenCalledWith('RateLimit-Reset', 12345);
    expect(response.header).toHaveBeenCalledWith('RateLimit-Remaining', 0);
  });

  it('returns service unavailable when the provider fails', async () => {
    const { context } = createContext({ apiKey: 'valid-key' });
    const { guard, rateLimitService } = createGuard(false);
    rateLimitService.check.mockRejectedValue(
      new RateLimitError('RATE_LIMIT_PROVIDER_UNAVAILABLE'),
    );
    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
