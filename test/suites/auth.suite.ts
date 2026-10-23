import { createHash } from 'node:crypto';
import { SessionResponse } from '#src/modules/auth/auth.schemas';
import { MailerService } from '#src/modules/mailer/mailer.service';
import { UsersService } from '#src/modules/users/users.service';
import { getOtpCode } from '#test/helpers/create-session';
import type { Context } from '#test/helpers/context.type';
import { Suite } from '#test/helpers/suite.base';
import type { TestMailerService } from '#test/helpers/test-mailer.service';
import { createClient } from 'redis';

export class AuthSuite extends Suite {
  constructor(ctx: Context) {
    super(ctx);
  }

  register() {
    const mailer = () => this.ctx.app.get<TestMailerService>(MailerService);
    const usersService = () => this.ctx.app.get(UsersService);
    const email = 'john@example.com';
    const requestOtp = (targetEmail = email) =>
      this.ctx.client.POST('/auth/otp/request', {
        body: { email: targetEmail },
      });
    const lastCode = () => getOtpCode(mailer().messages.at(-1)!.html);
    const signIn = async (targetEmail = email) => {
      await requestOtp(targetEmail);
      const { data, response } = await this.ctx.client.POST(
        '/auth/otp/verify',
        {
          body: { email: targetEmail, code: lastCode() },
        },
      );
      expect(response.status).toBe(200);
      return SessionResponse.parse(data);
    };
    const setFirstPassword = async (
      targetEmail = email,
      newPassword = 'correct horse battery staple',
    ) => {
      const session = await signIn(targetEmail);
      await requestOtp(targetEmail);
      const { response } = await this.ctx.client.POST('/auth/password/set', {
        headers: { authorization: `Bearer ${session.accessToken}` },
        body: { otpCode: lastCode(), newPassword },
      });
      expect(response.status).toBe(204);
      return session;
    };
    const lastResetLink = () => {
      const html = mailer().messages.at(-1)?.html ?? '';
      const href = html.match(/href="([^"]+)"/)?.[1];
      if (!href) throw new Error('Reset email did not contain a link');
      return new URL(href);
    };

    describe('Auth', () => {
      describe('security', () => {
        it('rejects a request without an API key', async () => {
          const { response } = await this.ctx.clientWithoutApiKey.POST(
            '/auth/otp/request',
            { body: { email } },
          );
          expect(response.status).toBe(401);
        });

        it('rejects /auth/me request without a bearer token', async () => {
          const { response } = await this.ctx.client.GET('/auth/me');
          expect(response.status).toBe(401);
        });
      });

      describe('otp/request', () => {
        it('sends a 6-digit OTP that expires in 5 minutes', async () => {
          await requestOtp();
          expect(mailer().messages.at(-1)?.subject).toBe(
            'Kode Masuk CryptoSharia',
          );
          expect(mailer().messages.at(-1)?.html).toMatch(/\d{6}/);
          expect(mailer().messages.at(-1)?.html).toContain('5 menit');
        });

        it('returns 204 for an unknown email to prevent enumeration', async () => {
          const { response } = await requestOtp('nobody@example.com');
          expect(response.status).toBe(204);
        });

        it('rejects a malformed email', async () => {
          const { response } = await this.ctx.client.POST('/auth/otp/request', {
            body: { email: 'not-an-email' },
          });
          expect(response.status).toBe(422);
        });

        it('limits requests and reports the wait via Retry-After', async () => {
          await requestOtp();
          await requestOtp();
          await requestOtp();
          const { response } = await requestOtp();
          expect(response.status).toBe(429);
          expect(response.headers.get('retry-after')).not.toBeNull();
        });
      });

      describe('otp/verify', () => {
        it('creates a user with an email-prefix name and returns a session', async () => {
          await requestOtp();
          const { data, response } = await this.ctx.client.POST(
            '/auth/otp/verify',
            { body: { email, code: lastCode() } },
          );
          expect(response.status).toBe(200);
          expect(typeof data?.accessToken).toBe('string');
          expect(typeof data?.refreshToken).toBe('string');
          const user = await usersService().selectByEmail(email);
          expect(user.name).toBe('john');
        });

        it('rejects a wrong code and reports remaining attempts', async () => {
          await requestOtp();
          const { error, response } = await this.ctx.client.POST(
            '/auth/otp/verify',
            { body: { email, code: '000000' } },
          );
          expect(response.status).toBe(400);
          const details = (
            error as { details?: { attemptsRemaining: number } } | undefined
          )?.details;
          expect(details?.attemptsRemaining).toBe(4);
        });

        it('locks out after 5 failed attempts', async () => {
          await requestOtp();
          for (let attempt = 0; attempt < 4; attempt++) {
            await this.ctx.client.POST('/auth/otp/verify', {
              body: { email, code: '000000' },
            });
          }
          const locked = await this.ctx.client.POST('/auth/otp/verify', {
            body: { email, code: '000000' },
          });
          expect(locked.response.status).toBe(429);
        });

        it('accepts a code only once', async () => {
          await requestOtp();
          const code = lastCode();
          const first = await this.ctx.client.POST('/auth/otp/verify', {
            body: { email, code },
          });
          expect(first.response.status).toBe(200);
          const reused = await this.ctx.client.POST('/auth/otp/verify', {
            body: { email, code },
          });
          expect(reused.response.status).toBe(400);
        });
      });

      describe('password', () => {
        it('sets a first password only after a fresh matching OTP and keeps OTP login', async () => {
          const session = await signIn();
          expect(
            (await usersService().selectByEmail(email)).passwordHash,
          ).toBeNull();

          await requestOtp();
          const otpCode = lastCode();
          const unauthenticated = await this.ctx.client.POST(
            '/auth/password/set',
            { body: { otpCode, newPassword: 'correct horse battery staple' } },
          );
          expect(unauthenticated.response.status).toBe(401);

          const wrongOtp = await this.ctx.client.POST('/auth/password/set', {
            headers: { authorization: `Bearer ${session.accessToken}` },
            body: {
              otpCode: '000000',
              newPassword: 'correct horse battery staple',
            },
          });
          expect(wrongOtp.response.status).toBe(400);

          const set = await this.ctx.client.POST('/auth/password/set', {
            headers: { authorization: `Bearer ${session.accessToken}` },
            body: { otpCode, newPassword: 'correct horse battery staple' },
          });
          expect(set.response.status).toBe(204);

          const storedUser = await usersService().selectByEmail(email);
          expect(storedUser.passwordHash).toMatch(
            /^\$argon2id\$v=19\$m=65536,/,
          );
          expect(storedUser.passwordHash).toContain('t=3');
          expect(storedUser.passwordHash).toContain('p=1');
          expect(storedUser.passwordHash).not.toContain(
            'correct horse battery staple',
          );
          expect(storedUser.passwordSetAt).toBeInstanceOf(Date);

          const profile = await this.ctx.client.GET('/auth/me', {
            headers: { authorization: `Bearer ${session.accessToken}` },
          });
          expect(profile.response.status).toBe(200);
          expect(profile.data).toHaveProperty('hasPassword', true);
          expect(profile.data).not.toHaveProperty('passwordHash');
          expect(profile.data).not.toHaveProperty('password_hash');

          const passwordLogin = await this.ctx.client.POST(
            '/auth/password/login',
            {
              body: { email, password: 'correct horse battery staple' },
            },
          );
          expect(passwordLogin.response.status).toBe(200);
          expect(passwordLogin.data).not.toHaveProperty('passwordHash');
          if (!passwordLogin.data)
            throw new Error('Password login returned no session');
          const jwtClaims = JSON.parse(
            Buffer.from(
              passwordLogin.data.accessToken.split('.')[1],
              'base64url',
            ).toString('utf8'),
          ) as Record<string, unknown>;
          expect(jwtClaims.role).toBe('member');
          expect(jwtClaims).not.toHaveProperty('password');
          expect(jwtClaims).not.toHaveProperty('passwordHash');

          await requestOtp();
          const otpLogin = await this.ctx.client.POST('/auth/otp/verify', {
            body: { email, code: lastCode() },
          });
          expect(otpLogin.response.status).toBe(200);
        });

        it('uses the same generic response for wrong passwords and unknown users', async () => {
          await setFirstPassword();
          const wrongPassword = await this.ctx.client.POST(
            '/auth/password/login',
            {
              body: { email, password: 'incorrect password here' },
            },
          );
          const unknownEmail = await this.ctx.client.POST(
            '/auth/password/login',
            {
              body: {
                email: 'unknown@example.com',
                password: 'incorrect password here',
              },
            },
          );
          expect(wrongPassword.response.status).toBe(401);
          expect(unknownEmail.response.status).toBe(401);
          expect(wrongPassword.error).toMatchObject({
            error: 'PASSWORD_INVALID_CREDENTIALS',
            message: 'Email atau kata sandi tidak valid.',
          });
          expect(unknownEmail.error).toEqual(wrongPassword.error);

          const tooLong = await this.ctx.client.POST('/auth/password/login', {
            body: { email, password: 'x'.repeat(129) },
          });
          expect(tooLong.response.status).toBe(422);
        });

        it('keeps a member out of admin APIs after password login', async () => {
          await setFirstPassword();
          const login = await this.ctx.client.POST('/auth/password/login', {
            body: { email, password: 'correct horse battery staple' },
          });
          if (!login.data)
            throw new Error('Password login returned no session');

          const adminUsers = await this.ctx.client.GET('/users', {
            headers: { authorization: `Bearer ${login.data.accessToken}` },
          });
          expect(adminUsers.response.status).toBe(403);
        });

        it('uses fixed application reset origins and hides account existence', async () => {
          await signIn();
          const knownAdmin = await this.ctx.client.POST(
            '/auth/password/forgot',
            {
              body: { email, application: 'admin' },
            },
          );
          const adminLink = lastResetLink();
          const unknown = await this.ctx.client.POST('/auth/password/forgot', {
            body: { email: 'unknown@example.com', application: 'admin' },
          });
          const knownLearning = await this.ctx.client.POST(
            '/auth/password/forgot',
            {
              body: { email, application: 'learning' },
            },
          );
          const learningLink = lastResetLink();

          expect(knownAdmin.response.status).toBe(204);
          expect(unknown.response.status).toBe(204);
          expect(knownLearning.response.status).toBe(204);
          expect(adminLink.origin).toBe(
            process.env.PASSWORD_RESET_ADMIN_ORIGIN,
          );
          expect(adminLink.pathname).toMatch(
            /^\/reset-password\/[A-Za-z0-9_-]{43}$/,
          );
          expect(learningLink.origin).toBe(
            process.env.PASSWORD_RESET_LEARNING_ORIGIN,
          );
          expect(learningLink.pathname).toMatch(
            /^\/auth\/reset-password\/[A-Za-z0-9_-]{43}$/,
          );
          expect(
            mailer().messages.filter((message) =>
              message.subject.includes('Atur ulang'),
            ),
          ).toHaveLength(2);
          expect(adminLink.pathname).not.toContain('unknown');
        });

        it('limits password attempts by account and by IP', async () => {
          await setFirstPassword();
          const accountAttemptStatuses: number[] = [];
          for (let attempt = 0; attempt < 6; attempt += 1) {
            accountAttemptStatuses.push(
              (
                await this.ctx.client.POST('/auth/password/login', {
                  body: { email, password: 'incorrect password here' },
                })
              ).response.status,
            );
          }
          expect(
            accountAttemptStatuses
              .slice(0, 5)
              .every((status) => status === 401),
          ).toBe(true);
          expect(accountAttemptStatuses[5]).toBe(429);

          const ipAttemptStatuses: number[] = [];
          for (let attempt = 0; attempt < 31; attempt += 1) {
            ipAttemptStatuses.push(
              (
                await this.ctx.client.POST('/auth/password/login', {
                  headers: { forwarded: 'for="203.0.113.7"' },
                  body: {
                    email: `unknown-${attempt}@example.com`,
                    password: 'incorrect password here',
                  },
                })
              ).response.status,
            );
          }
          expect(
            ipAttemptStatuses.slice(0, 30).every((status) => status === 401),
          ).toBe(true);
          expect(ipAttemptStatuses[30]).toBe(429);
        }, 60_000);

        it('consumes reset tokens atomically, revokes refresh sessions, and bounds old access tokens', async () => {
          const oldSession = await setFirstPassword();
          const forgot = await this.ctx.client.POST('/auth/password/forgot', {
            body: { email, application: 'learning' },
          });
          expect(forgot.response.status).toBe(204);
          const token = lastResetLink().pathname.split('/').at(-1);
          if (!token)
            throw new Error('Reset token was missing from the email sink');

          const resetA = 'New password alpha 123';
          const resetB = 'New password bravo 456';
          const results = await Promise.all([
            this.ctx.client.POST('/auth/password/reset', {
              body: { token, newPassword: resetA },
            }),
            this.ctx.client.POST('/auth/password/reset', {
              body: { token, newPassword: resetB },
            }),
          ]);
          const successIndex = results.findIndex(
            (result) => result.response.status === 204,
          );
          expect(
            results.map((result) => result.response.status).sort(),
          ).toEqual([204, 400]);
          const winningPassword = successIndex === 0 ? resetA : resetB;
          const losingPassword = successIndex === 0 ? resetB : resetA;

          const oldRefresh = await this.ctx.client.POST('/auth/refresh', {
            body: { refreshToken: oldSession.refreshToken },
          });
          expect(oldRefresh.response.status).toBe(401);
          const stillLiveAccess = await this.ctx.client.GET('/auth/me', {
            headers: { authorization: `Bearer ${oldSession.accessToken}` },
          });
          expect(stillLiveAccess.response.status).toBe(200);

          const winningLogin = await this.ctx.client.POST(
            '/auth/password/login',
            {
              body: { email, password: winningPassword },
            },
          );
          const losingLogin = await this.ctx.client.POST(
            '/auth/password/login',
            {
              body: { email, password: losingPassword },
            },
          );
          expect(winningLogin.response.status).toBe(200);
          expect(losingLogin.response.status).toBe(401);

          const replay = await this.ctx.client.POST('/auth/password/reset', {
            body: { token, newPassword: 'another valid password' },
          });
          expect(replay.response.status).toBe(400);
        });

        it('rejects a reset token after its Redis TTL expires', async () => {
          await signIn();
          const forgot = await this.ctx.client.POST('/auth/password/forgot', {
            body: { email, application: 'admin' },
          });
          expect(forgot.response.status).toBe(204);
          const token = lastResetLink().pathname.split('/').at(-1);
          if (!token)
            throw new Error('Reset token was missing from the email sink');

          const redis = createClient({ url: process.env.REDIS_URL });
          await redis.connect();
          try {
            const tokenHash = createHash('sha256').update(token).digest('hex');
            await redis.pExpire(`password_reset:${tokenHash}`, 1);
          } finally {
            await redis.quit();
          }
          await new Promise((resolve) => setTimeout(resolve, 25));

          const expired = await this.ctx.client.POST('/auth/password/reset', {
            body: { token, newPassword: 'valid replacement password' },
          });
          expect(expired.response.status).toBe(400);
        });

        it('keeps reset requests enumeration-safe and rate-limited per account', async () => {
          await signIn();
          const resetRequestStatuses: number[] = [];
          for (let attempt = 0; attempt < 4; attempt += 1) {
            resetRequestStatuses.push(
              (
                await this.ctx.client.POST('/auth/password/forgot', {
                  body: { email, application: 'admin' },
                })
              ).response.status,
            );
          }
          expect(resetRequestStatuses.every((status) => status === 204)).toBe(
            true,
          );
          expect(
            mailer().messages.filter((message) =>
              message.subject.includes('Atur ulang'),
            ),
          ).toHaveLength(3);
        });
      });

      describe('refresh', () => {
        it('returns only an access token without rotating the refresh token', async () => {
          const session = await signIn();
          const refreshed = await this.ctx.client.POST('/auth/refresh', {
            body: { refreshToken: session.refreshToken },
          });
          expect(refreshed.response.status).toBe(200);
          expect(typeof refreshed.data?.accessToken).toBe('string');
          expect(refreshed.data).not.toHaveProperty('refreshToken');
          const again = await this.ctx.client.POST('/auth/refresh', {
            body: { refreshToken: session.refreshToken },
          });
          expect(again.response.status).toBe(200);
        });

        it('rejects an unknown refresh token', async () => {
          const { response } = await this.ctx.client.POST('/auth/refresh', {
            body: { refreshToken: 'no-such-user:no-such-token' },
          });
          expect(response.status).toBe(401);
        });
      });

      describe('signout', () => {
        it('revokes a refresh token idempotently', async () => {
          const session = await signIn();
          const first = await this.ctx.client.POST('/auth/signout', {
            body: { refreshToken: session.refreshToken },
          });
          const second = await this.ctx.client.POST('/auth/signout', {
            body: { refreshToken: session.refreshToken },
          });
          expect(first.response.status).toBe(204);
          expect(second.response.status).toBe(204);
          const refresh = await this.ctx.client.POST('/auth/refresh', {
            body: { refreshToken: session.refreshToken },
          });
          expect(refresh.response.status).toBe(401);
        });
      });

      describe('signout-all', () => {
        it('revokes every session of the user', async () => {
          const first = await signIn();
          const second = await signIn();
          const { response } = await this.ctx.client.POST('/auth/signout-all', {
            headers: { authorization: `Bearer ${second.accessToken}` },
          });
          expect(response.status).toBe(204);
          const firstRefresh = await this.ctx.client.POST('/auth/refresh', {
            body: { refreshToken: first.refreshToken },
          });
          const secondRefresh = await this.ctx.client.POST('/auth/refresh', {
            body: { refreshToken: second.refreshToken },
          });
          expect(firstRefresh.response.status).toBe(401);
          expect(secondRefresh.response.status).toBe(401);
        });
      });

      describe('me', () => {
        it('returns the safe user profile without permissions', async () => {
          const session = await signIn();
          const { data, response } = await this.ctx.client.GET('/auth/me', {
            headers: { authorization: `Bearer ${session.accessToken}` },
          });
          expect(response.status).toBe(200);
          expect(data).toMatchObject({ email, role: 'member', name: 'john' });
          expect(data).not.toHaveProperty('permissions');
          expect(data).not.toHaveProperty('avatarId');
          expect(data).toHaveProperty('avatar');
          expect(data?.avatar).toBeNull();
        });
      });

      describe('inactive user', () => {
        const setInactive = async () => {
          const user = await usersService().selectByEmail(email);
          await usersService().update(
            user.id,
            { status: 'inactive' },
            { id: user.id },
          );
        };

        it('rejects OTP verification with 403', async () => {
          await signIn();
          await setInactive();
          await requestOtp();
          const { response } = await this.ctx.client.POST('/auth/otp/verify', {
            body: { email, code: lastCode() },
          });
          expect(response.status).toBe(403);
        });

        it('rejects refresh with 403', async () => {
          const session = await signIn();
          await setInactive();
          const { response } = await this.ctx.client.POST('/auth/refresh', {
            body: { refreshToken: session.refreshToken },
          });
          expect(response.status).toBe(403);
        });

        it('rejects /auth/me with 403', async () => {
          const session = await signIn();
          await setInactive();
          const { response } = await this.ctx.client.GET('/auth/me', {
            headers: { authorization: `Bearer ${session.accessToken}` },
          });
          expect(response.status).toBe(403);
        });
      });
    });
  }
}
