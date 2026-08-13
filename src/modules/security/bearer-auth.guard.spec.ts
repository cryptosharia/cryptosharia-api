import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { BearerAuthGuard } from './bearer-auth.guard';

function createContext(headers: Record<string, string | undefined>) {
  const request = { headers };
  return {
    request,
    context: {
      switchToHttp: () => ({ getRequest: () => request }),
    },
  };
}

describe('BearerAuthGuard', () => {
  it('rejects a request without a bearer token', async () => {
    const { context } = createContext({});
    const guard = new BearerAuthGuard({ verifyJwt: vi.fn() } as never);

    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('attaches the authenticated user and role permissions', async () => {
    const { context, request } = createContext({
      authorization: 'Bearer token',
    });
    const cryptoService = {
      verifyJwt: vi.fn().mockResolvedValue({
        userId: '33e0c558-8e44-48e9-a4ef-d7f0fd072f32',
        role: 'posts_manager',
      }),
    };
    const guard = new BearerAuthGuard(cryptoService as never);

    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    expect(cryptoService.verifyJwt).toHaveBeenCalledWith('token', {
      issuer: 'api.cryptosharia.id',
    });
    expect(request).toMatchObject({
      user: {
        id: '33e0c558-8e44-48e9-a4ef-d7f0fd072f32',
        role: 'posts_manager',
        permissions: ['posts.manage', 'tags.manage'],
      },
    });
  });

  it('rejects an invalid token', async () => {
    const { context } = createContext({ authorization: 'Bearer token' });
    const guard = new BearerAuthGuard({
      verifyJwt: vi.fn().mockRejectedValue(new Error('Invalid token')),
    } as never);

    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
