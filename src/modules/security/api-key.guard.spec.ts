import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
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
});
