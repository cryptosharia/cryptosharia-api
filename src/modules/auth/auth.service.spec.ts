import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '#src/modules/drizzle/drizzle.types';
import { UsersError } from '#src/modules/users/users.error';
import { AuthError } from './auth.error';
import { AuthService } from './auth.service';

const user: User = {
  id: '33e0c558-8e44-48e9-a4ef-d7f0fd072f32',
  name: 'John Doe',
  email: 'john@example.com',
  hashedPassword: 'password-hash',
  passwordHashingAlgorithm: 'argon2id',
  avatarId: null,
  role: 'member',
  status: 'active',
  twoFactorSecret: null,
  lastLoginAt: null,
  isEmailVerified: true,
  createdAt: new Date(),
  updatedAt: null,
  updatedBy: null,
};

describe('AuthService', () => {
  let repository: Record<string, ReturnType<typeof vi.fn>>;
  let users: Record<string, ReturnType<typeof vi.fn>>;
  let crypto: Record<string, ReturnType<typeof vi.fn>>;
  let mailer: { send: ReturnType<typeof vi.fn> };
  let activityLogs: { log: ReturnType<typeof vi.fn> };
  let service: AuthService;

  beforeEach(() => {
    repository = {
      transaction: vi.fn((callback: (dbExecutor: object) => Promise<unknown>) =>
        callback({}),
      ),
      revokeActiveAuthTokens: vi.fn(),
      insertAuthToken: vi.fn(),
      consumeAuthToken: vi.fn(),
      insertRefreshToken: vi.fn(),
      consumeRefreshToken: vi.fn(),
      revokeRefreshToken: vi.fn(),
      revokeActiveRefreshTokens: vi.fn(),
    };
    users = {
      selectByEmail: vi.fn(),
      selectById: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    };
    crypto = {
      generateToken: vi.fn().mockReturnValue('raw-token'),
      hashToken: vi.fn((token: string) => `hash:${token}`),
      hashPassword: vi.fn().mockResolvedValue('password-hash'),
      verifyPassword: vi.fn().mockResolvedValue(true),
      needsPasswordRehash: vi.fn().mockReturnValue(false),
      signJwt: vi.fn().mockResolvedValue('access-token'),
    };
    mailer = { send: vi.fn().mockResolvedValue(undefined) };
    activityLogs = { log: vi.fn().mockResolvedValue(undefined) };
    service = new AuthService(
      repository as never,
      users as never,
      crypto as never,
      mailer as never,
      activityLogs as never,
    );
  });

  afterEach(() => vi.clearAllMocks());

  it('stores only a hash when signing up', async () => {
    users.selectByEmail.mockRejectedValue(new UsersError('USER_NOT_FOUND'));
    users.insert.mockResolvedValue({ ...user, isEmailVerified: false });

    await service.signup({
      name: ' John Doe ',
      email: ' JOHN@EXAMPLE.COM ',
      password: 'secure-password',
      redirectUrl: 'https://app.cryptosharia.id/verify/{token}',
    });

    expect(users.insert).toHaveBeenCalledWith(
      {
        name: 'John Doe',
        email: 'john@example.com',
        hashedPassword: 'password-hash',
      },
      expect.anything(),
    );
    expect(repository.insertAuthToken).toHaveBeenCalledWith(
      expect.objectContaining({ tokenHash: 'hash:raw-token' }),
      expect.anything(),
    );
  });

  it('returns only tokens after signin', async () => {
    users.selectByEmail.mockResolvedValue(user);

    await expect(
      service.signin({ email: user.email, password: 'secure-password' }),
    ).resolves.toEqual({
      accessToken: 'access-token',
      refreshToken: 'raw-token',
    });
    expect(repository.insertRefreshToken).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'hash:raw-token' }),
      expect.anything(),
    );
  });

  it('rotates refresh tokens and returns only the replacement pair', async () => {
    repository.consumeRefreshToken.mockResolvedValue({ userId: user.id });
    users.selectById.mockResolvedValue(user);

    await expect(
      service.refresh({ refreshToken: 'old-token' }),
    ).resolves.toEqual({
      accessToken: 'access-token',
      refreshToken: 'raw-token',
    });
    expect(repository.consumeRefreshToken).toHaveBeenCalledWith(
      expect.objectContaining({ tokenHash: 'hash:old-token' }),
      expect.anything(),
    );
  });

  it('maps an unknown signin email to invalid credentials', async () => {
    users.selectByEmail.mockRejectedValue(new AuthError('INVALID_CREDENTIALS'));

    await expect(
      service.signin({ email: user.email, password: 'secure-password' }),
    ).rejects.toEqual(new AuthError('INVALID_CREDENTIALS'));
  });
});
