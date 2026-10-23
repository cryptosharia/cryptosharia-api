import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '#src/modules/drizzle/drizzle.types';
import { UsersError } from '#src/modules/users/users.error';
import { AuthService } from './auth.service';

const user: User = {
  id: '33e0c558-8e44-48e9-a4ef-d7f0fd072f32',
  name: 'John Doe',
  email: 'john@example.com',
  avatarId: null,
  role: 'member',
  status: 'active',
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: null,
  updatedBy: null,
};

function otpHash(email: string, code: string) {
  return createHmac('sha256', 'test-otp-secret')
    .update(`${email}:${code}`)
    .digest('hex');
}

describe('AuthService', () => {
  let authRepository: Record<string, ReturnType<typeof vi.fn>>;
  let users: Record<string, ReturnType<typeof vi.fn>>;
  let crypto: Record<string, ReturnType<typeof vi.fn>>;
  let mailer: { send: ReturnType<typeof vi.fn> };
  let audit: { log: ReturnType<typeof vi.fn> };
  let config: {
    getOrThrow: (key: string) => string;
    get: (key: string) => string | undefined;
  };
  let service: AuthService;

  beforeEach(() => {
    authRepository = {
      getOtpHash: vi.fn(),
      saveOtp: vi.fn().mockResolvedValue(undefined),
      consumeOtp: vi.fn(),
      getOtpTtl: vi.fn().mockResolvedValue(0),
      incrementOtpAttempts: vi.fn().mockResolvedValue(1),
      setOtpAttemptsTtl: vi.fn().mockResolvedValue(1),
      clearOtpAttempts: vi.fn().mockResolvedValue(1),
      clearOtp: vi.fn().mockResolvedValue(2),
      incrementRateLimit: vi.fn().mockResolvedValue(1),
      setRateLimitTtl: vi.fn().mockResolvedValue(1),
      getRateLimitTtl: vi.fn().mockResolvedValue(0),
      saveSession: vi.fn().mockResolvedValue(undefined),
      getSession: vi.fn(),
      extendSession: vi.fn().mockResolvedValue(1),
      deleteSession: vi.fn().mockResolvedValue(1),
      deleteUserSessions: vi.fn().mockResolvedValue(2),
      incrementPasswordLoginLimit: vi.fn().mockResolvedValue(1),
      incrementPasswordResetLimit: vi.fn().mockResolvedValue(1),
      savePasswordResetToken: vi.fn().mockResolvedValue(undefined),
      consumePasswordResetToken: vi.fn(),
    };
    users = {
      selectByEmail: vi.fn(),
      selectById: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      updatePassword: vi.fn().mockResolvedValue(undefined),
      hasPassword: vi.fn().mockResolvedValue(false),
      updateLastLoginAt: vi.fn(),
    };
    crypto = {
      generateToken: vi.fn().mockReturnValue('raw-token'),
      hashToken: vi.fn((token: string) => `hash:${token}`),
      signJwt: vi.fn().mockResolvedValue('access-token'),
      hashPassword: vi.fn().mockResolvedValue('argon-hash'),
      verifyPassword: vi.fn().mockResolvedValue(false),
    };
    mailer = { send: vi.fn().mockResolvedValue(undefined) };
    audit = { log: vi.fn().mockResolvedValue(undefined) };
    config = {
      getOrThrow: vi.fn().mockReturnValue('test-otp-secret'),
      get: vi.fn((name: string) =>
        name === 'PASSWORD_RESET_ADMIN_ORIGIN'
          ? 'https://admin.example.test'
          : 'https://learning.example.test',
      ),
    };
    authRepository.consumeOtp.mockResolvedValue(otpHash(user.email, '123456'));
    service = new AuthService(
      users as never,
      crypto as never,
      mailer as never,
      audit as never,
      authRepository as never,
      config as never,
    );
  });

  afterEach(() => vi.clearAllMocks());

  describe('requestOtp', () => {
    it('sends a 6-digit OTP and stores its HMAC hash', async () => {
      await service.requestOtp({ email: ' JOHN@EXAMPLE.COM ' });

      expect(authRepository.incrementRateLimit).toHaveBeenCalledWith(
        'john@example.com',
      );
      expect(authRepository.setRateLimitTtl).toHaveBeenCalledWith(
        'john@example.com',
        900,
      );
      expect(mailer.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'john@example.com',
          subject: 'Kode Masuk CryptoSharia',
        }),
      );
      const sendArgs = mailer.send.mock.calls[0][0] as { html: string };
      const code = sendArgs.html.match(/(\d{6})/)![1];
      expect(authRepository.saveOtp).toHaveBeenCalledWith(
        'john@example.com',
        otpHash('john@example.com', code),
        300,
      );
      expect(authRepository.clearOtpAttempts).toHaveBeenCalledWith(
        'john@example.com',
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.otp.request' }),
      );
    });

    it('limits requests and reports the wait in seconds', async () => {
      authRepository.incrementRateLimit.mockResolvedValue(4);
      authRepository.getRateLimitTtl.mockResolvedValue(42);

      await expect(
        service.requestOtp({ email: user.email }),
      ).rejects.toMatchObject({
        code: 'OTP_REQUEST_RATE_LIMITED',
        retryAfterSeconds: 42,
      });
      expect(authRepository.saveOtp).not.toHaveBeenCalled();
    });

    it('swallows mailer failures so the email does not reveal the account', async () => {
      mailer.send.mockRejectedValue(new Error('SMTP down'));

      await expect(
        service.requestOtp({ email: user.email }),
      ).resolves.toBeUndefined();
    });
  });

  describe('verifyOtp', () => {
    it('creates a user from the email prefix and returns a session', async () => {
      authRepository.getOtpHash.mockResolvedValue(
        otpHash('john@example.com', '123456'),
      );
      users.selectByEmail.mockRejectedValue(new UsersError('USER_NOT_FOUND'));
      users.insert.mockResolvedValue(user);

      await expect(
        service.verifyOtp({
          email: ' JOHN@EXAMPLE.COM ',
          code: '123456',
        }),
      ).resolves.toEqual({
        accessToken: 'access-token',
        refreshToken: `${user.id}:raw-token`,
      });
      expect(users.insert).toHaveBeenCalledWith({
        name: 'john',
        email: 'john@example.com',
      });
      expect(authRepository.consumeOtp).toHaveBeenCalledWith(
        'john@example.com',
      );
      expect(authRepository.saveSession).toHaveBeenCalledWith(
        user.id,
        'hash:raw-token',
        15 * 24 * 60 * 60,
        expect.any(String),
      );
      expect(users.updateLastLoginAt).toHaveBeenCalledWith(user.id);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.signin' }),
      );
    });

    it('falls back to the account created by a concurrent request', async () => {
      authRepository.getOtpHash.mockResolvedValue(
        otpHash(user.email, '123456'),
      );
      users.selectByEmail
        .mockRejectedValueOnce(new UsersError('USER_NOT_FOUND'))
        .mockResolvedValueOnce(user);
      users.insert.mockRejectedValue(new UsersError('EMAIL_UNIQUE_VIOLATION'));

      await expect(
        service.verifyOtp({ email: user.email, code: '123456' }),
      ).resolves.toEqual({
        accessToken: 'access-token',
        refreshToken: `${user.id}:raw-token`,
      });
    });

    it('rejects a code when no OTP was requested', async () => {
      authRepository.getOtpHash.mockResolvedValue(null);

      await expect(
        service.verifyOtp({ email: user.email, code: '123456' }),
      ).rejects.toMatchObject({ code: 'OTP_INVALID_OR_EXPIRED' });
    });

    it('rejects a wrong code and reports remaining attempts', async () => {
      authRepository.getOtpHash.mockResolvedValue(
        otpHash(user.email, '123456'),
      );
      authRepository.incrementOtpAttempts.mockResolvedValue(1);
      authRepository.getOtpTtl.mockResolvedValue(120);

      await expect(
        service.verifyOtp({ email: user.email, code: '000000' }),
      ).rejects.toMatchObject({
        code: 'OTP_INVALID_OR_EXPIRED',
        details: { attemptsRemaining: 4 },
      });
      expect(authRepository.setOtpAttemptsTtl).toHaveBeenCalledWith(
        user.email,
        120,
      );
    });

    it('locks out after the attempt limit and clears the OTP', async () => {
      authRepository.getOtpHash.mockResolvedValue(
        otpHash(user.email, '123456'),
      );
      authRepository.incrementOtpAttempts.mockResolvedValue(5);

      await expect(
        service.verifyOtp({ email: user.email, code: '000000' }),
      ).rejects.toMatchObject({ code: 'OTP_MAX_ATTEMPTS_EXCEEDED' });
      expect(authRepository.clearOtp).toHaveBeenCalledWith(user.email);
    });

    it('rejects an inactive user after a valid code', async () => {
      authRepository.getOtpHash.mockResolvedValue(
        otpHash(user.email, '123456'),
      );
      users.selectByEmail.mockResolvedValue({ ...user, status: 'banned' });

      await expect(
        service.verifyOtp({ email: user.email, code: '123456' }),
      ).rejects.toMatchObject({ code: 'USER_INACTIVE' });
    });
  });

  describe('loginWithPassword', () => {
    it('returns an existing session pair for a valid password', async () => {
      const record = {
        ...user,
        passwordHash: 'argon-hash',
        passwordSetAt: new Date(),
      };
      users.selectByEmail.mockResolvedValue(record);
      crypto.verifyPassword.mockResolvedValue(true);

      await expect(
        service.loginWithPassword({
          email: ' JOHN@EXAMPLE.COM ',
          password: 'correct horse battery staple',
          ipAddress: '192.0.2.4',
        }),
      ).resolves.toEqual({
        accessToken: 'access-token',
        refreshToken: `${user.id}:raw-token`,
      });
      expect(crypto.verifyPassword).toHaveBeenCalledWith(
        'correct horse battery staple',
        'argon-hash',
      );
      expect(authRepository.saveSession).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.password.login' }),
      );
    });

    it('uses the generic error for a wrong password and an unknown email', async () => {
      users.selectByEmail.mockResolvedValue({
        ...user,
        passwordHash: 'argon-hash',
        passwordSetAt: new Date(),
      });
      crypto.verifyPassword.mockResolvedValue(false);
      await expect(
        service.loginWithPassword({ email: user.email, password: 'incorrect' }),
      ).rejects.toMatchObject({
        code: 'PASSWORD_INVALID_CREDENTIALS',
        message: 'Email atau kata sandi tidak valid.',
      });

      users.selectByEmail.mockRejectedValue(new UsersError('USER_NOT_FOUND'));
      crypto.verifyPassword.mockResolvedValue(false);
      await expect(
        service.loginWithPassword({
          email: 'missing@example.com',
          password: 'incorrect',
        }),
      ).rejects.toMatchObject({ code: 'PASSWORD_INVALID_CREDENTIALS' });
      expect(crypto.verifyPassword).toHaveBeenCalledTimes(2);
    });

    it('rejects OTP-only accounts using the same generic credential response', async () => {
      users.selectByEmail.mockResolvedValue({
        ...user,
        passwordHash: null,
        passwordSetAt: null,
      });
      crypto.verifyPassword.mockResolvedValue(false);

      await expect(
        service.loginWithPassword({
          email: user.email,
          password: 'some password',
        }),
      ).rejects.toMatchObject({ code: 'PASSWORD_INVALID_CREDENTIALS' });
      expect(crypto.hashPassword).toHaveBeenCalledTimes(1);
      expect(crypto.verifyPassword).toHaveBeenCalledWith(
        'some password',
        'argon-hash',
      );
    });

    it('rate limits by account before checking credentials', async () => {
      authRepository.incrementPasswordLoginLimit
        .mockResolvedValueOnce(6)
        .mockResolvedValueOnce(1);

      await expect(
        service.loginWithPassword({ email: user.email, password: 'incorrect' }),
      ).rejects.toMatchObject({ code: 'PASSWORD_LOGIN_RATE_LIMITED' });
      expect(users.selectByEmail).not.toHaveBeenCalled();
    });
  });

  describe('password reset and first-time set', () => {
    it('sets an OTP-only account password only after consuming a matching OTP', async () => {
      users.selectById.mockResolvedValue(user);
      users.selectByEmail.mockResolvedValue({
        ...user,
        passwordHash: null,
        passwordSetAt: null,
      });
      authRepository.getOtpHash.mockResolvedValue(
        otpHash(user.email, '123456'),
      );

      await service.setPassword({
        userId: user.id,
        otpCode: '123456',
        newPassword: 'a secure new password',
      });

      expect(authRepository.consumeOtp).toHaveBeenCalledWith(user.email);
      expect(users.updatePassword).toHaveBeenCalledWith(user.id, 'argon-hash');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.password.set' }),
      );
      expect(JSON.stringify(audit.log.mock.calls)).not.toContain('argon-hash');
    });

    it('sends a hashed, expiring token only for an active account', async () => {
      users.selectByEmail.mockResolvedValue({ ...user, passwordHash: null });

      const result = await service.requestPasswordReset({
        email: user.email,
        application: 'learning',
        ipAddress: '192.0.2.4',
      });

      expect(result).toBeUndefined();
      expect(authRepository.savePasswordResetToken).toHaveBeenCalledWith(
        expect.stringMatching(/^hash:/),
        user.id,
        900,
      );
      const sent = mailer.send.mock.calls[0][0] as { html: string };
      expect(sent.html).toContain(
        'https://learning.example.test/auth/reset-password/',
      );
      expect(sent.html).not.toContain('passwordHash');
    });

    it('returns the same result for unknown and rate-limited reset requests', async () => {
      users.selectByEmail.mockRejectedValue(new UsersError('USER_NOT_FOUND'));
      await expect(
        service.requestPasswordReset({
          email: 'missing@example.com',
          application: 'admin',
        }),
      ).resolves.toBeUndefined();
      expect(mailer.send).not.toHaveBeenCalled();

      authRepository.incrementPasswordResetLimit
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(1);
      await expect(
        service.requestPasswordReset({
          email: user.email,
          application: 'admin',
        }),
      ).resolves.toBeUndefined();
      expect(users.selectByEmail).toHaveBeenCalledTimes(1);
    });

    it('resets once, revokes old sessions, and rejects replay or expiry', async () => {
      authRepository.consumePasswordResetToken.mockResolvedValueOnce(user.id);
      users.selectById.mockResolvedValue(user);

      await service.resetPassword({
        token: 'A'.repeat(43),
        newPassword: 'a secure new password',
        ipAddress: '192.0.2.4',
      });

      expect(users.updatePassword).toHaveBeenCalledWith(user.id, 'argon-hash');
      expect(authRepository.deleteUserSessions).toHaveBeenCalledWith(user.id);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.password.reset' }),
      );

      await expect(
        service.resetPassword({
          token: 'A'.repeat(43),
          newPassword: 'a secure new password',
        }),
      ).rejects.toMatchObject({ code: 'PASSWORD_RESET_INVALID' });
      authRepository.consumePasswordResetToken.mockResolvedValueOnce(null);
      await expect(
        service.resetPassword({
          token: 'B'.repeat(43),
          newPassword: 'a secure new password',
        }),
      ).rejects.toMatchObject({ code: 'PASSWORD_RESET_INVALID' });
    });
  });

  describe('refresh', () => {
    it('returns a fresh access token and slides the session expiry', async () => {
      authRepository.getSession.mockResolvedValue(new Date().toISOString());
      users.selectById.mockResolvedValue(user);

      await expect(
        service.refresh({ refreshToken: `${user.id}:raw-token` }),
      ).resolves.toEqual({ accessToken: 'access-token' });
      expect(authRepository.extendSession).toHaveBeenCalledWith(
        user.id,
        'hash:raw-token',
        15 * 24 * 60 * 60,
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.refresh' }),
      );
    });

    it('rejects a malformed refresh token', async () => {
      await expect(
        service.refresh({ refreshToken: 'no-colon-here' }),
      ).rejects.toMatchObject({ code: 'REFRESH_TOKEN_INVALID' });
    });

    it('rejects a refresh token with no stored session', async () => {
      authRepository.getSession.mockResolvedValue(null);

      await expect(
        service.refresh({ refreshToken: `${user.id}:raw-token` }),
      ).rejects.toMatchObject({ code: 'REFRESH_TOKEN_INVALID' });
    });

    it('rejects a refresh token for a deleted account', async () => {
      authRepository.getSession.mockResolvedValue(new Date().toISOString());
      users.selectById.mockRejectedValue(new UsersError('USER_NOT_FOUND'));

      await expect(
        service.refresh({ refreshToken: `${user.id}:raw-token` }),
      ).rejects.toMatchObject({ code: 'REFRESH_TOKEN_INVALID' });
    });
  });

  describe('signout', () => {
    it('revokes the session and logs the audit trail', async () => {
      await service.signout({ refreshToken: `${user.id}:raw-token` });

      expect(authRepository.deleteSession).toHaveBeenCalledWith(
        user.id,
        'hash:raw-token',
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.signout' }),
      );
    });

    it('ignores a malformed refresh token', async () => {
      await service.signout({ refreshToken: 'no-colon-here' });

      expect(authRepository.deleteSession).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });
  });

  describe('signoutAll', () => {
    it('revokes every session of the user', async () => {
      await service.signoutAll(user.id);

      expect(authRepository.deleteUserSessions).toHaveBeenCalledWith(user.id);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.signout-all' }),
      );
    });
  });

  describe('me', () => {
    it('returns the profile of an active user', async () => {
      users.selectById.mockResolvedValue(user);
      users.hasPassword.mockResolvedValue(false);

      await expect(service.me(user.id)).resolves.toEqual({
        ...user,
        hasPassword: false,
      });
    });

    it('rejects an unknown user id', async () => {
      users.selectById.mockRejectedValue(new UsersError('USER_NOT_FOUND'));

      await expect(service.me(user.id)).rejects.toMatchObject({
        code: 'REFRESH_TOKEN_INVALID',
      });
    });
  });
});
