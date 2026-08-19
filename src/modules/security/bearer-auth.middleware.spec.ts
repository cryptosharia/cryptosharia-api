import { BearerAuthMiddleware } from './bearer-auth.middleware';

function createRequest(headers: Record<string, string | undefined>) {
  return { headers, user: null as unknown };
}

describe('BearerAuthMiddleware', () => {
  it('resolves a valid bearer token into the current user', async () => {
    const cryptoService = {
      verifyJwt: vi.fn().mockResolvedValue({
        sub: '33e0c558-8e44-48e9-a4ef-d7f0fd072f32',
        role: 'posts_manager',
      }),
    };
    const middleware = new BearerAuthMiddleware(cryptoService as never);
    const request = createRequest({ authorization: 'Bearer token' });
    const next = vi.fn();

    await middleware.use(request as never, {} as never, next);

    expect(cryptoService.verifyJwt).toHaveBeenCalledWith('token', {
      issuer: 'api.cryptosharia.id',
    });
    expect(request.user).toEqual({
      id: '33e0c558-8e44-48e9-a4ef-d7f0fd072f32',
      role: 'posts_manager',
      permissions: ['posts.manage', 'tags.manage'],
    });
    expect(next).toHaveBeenCalled();
  });

  it('leaves the user null when no bearer token is present', async () => {
    const middleware = new BearerAuthMiddleware({
      verifyJwt: vi.fn(),
    } as never);
    const request = createRequest({});
    const next = vi.fn();

    await middleware.use(request as never, {} as never, next);

    expect(request.user).toBeNull();
    expect(next).toHaveBeenCalled();
  });

  it('treats an invalid token as a guest', async () => {
    const cryptoService = {
      verifyJwt: vi.fn().mockRejectedValue(new Error('Invalid token')),
    };
    const middleware = new BearerAuthMiddleware(cryptoService as never);
    const request = createRequest({ authorization: 'Bearer token' });
    const next = vi.fn();

    await middleware.use(request as never, {} as never, next);

    expect(request.user).toBeNull();
    expect(next).toHaveBeenCalled();
  });
});
