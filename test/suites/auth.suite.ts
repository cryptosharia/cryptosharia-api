import { SessionResponse } from '#src/modules/auth/auth.schemas';
import { MailerService } from '#src/modules/mailer/mailer.service';
import { UsersService } from '#src/modules/users/users.service';
import { getOtpCode } from '#test/helpers/create-session';
import type { Context } from '#test/helpers/context.type';
import { Suite } from '#test/helpers/suite.base';
import type { TestMailerService } from '#test/helpers/test-mailer.service';

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
