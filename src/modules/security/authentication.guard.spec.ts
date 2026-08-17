import { UnauthorizedException } from '@nestjs/common';
import { AuthenticationGuard } from './authentication.guard';

function createContext(user: unknown) {
  const request = { raw: { user } };
  return {
    request,
    context: {
      switchToHttp: () => ({ getRequest: () => request }),
    },
  };
}

describe('AuthenticationGuard', () => {
  it('rejects a request without an authenticated user', () => {
    const { context } = createContext(null);
    const guard = new AuthenticationGuard();

    expect(() => guard.canActivate(context as never)).toThrow(
      UnauthorizedException,
    );
  });

  it('allows a request with an authenticated user', () => {
    const { context } = createContext({
      id: '33e0c558-8e44-48e9-a4ef-d7f0fd072f32',
      role: 'posts_manager',
      permissions: ['posts.manage', 'tags.manage'],
    });
    const guard = new AuthenticationGuard();

    expect(guard.canActivate(context as never)).toBe(true);
  });
});
