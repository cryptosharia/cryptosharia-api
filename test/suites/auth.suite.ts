import { SessionResponse } from '#src/modules/auth/auth.schemas';
import { MailerService } from '#src/modules/mailer/mailer.service';
import type { Context } from '#test/helpers/context.type';
import { Suite } from '#test/helpers/suite.base';
import type { TestMailerService } from '#test/helpers/test-mailer.service';

function getToken(html: string) {
  const match = html.match(/(?:verify|reset-password)\/([^"<]+)/);
  if (!match) throw new Error('Email does not contain a token link');
  return match[1];
}

export class AuthSuite extends Suite {
  constructor(ctx: Context) {
    super(ctx);
  }

  register() {
    const mailer = () => this.ctx.app.get<TestMailerService>(MailerService);
    const signupBody = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'secure-password',
      redirectUrl: 'https://app.cryptosharia.id/verify/{token}',
    };
    const signup = async () => {
      const { response } = await this.ctx.client.POST('/auth/signup', {
        body: signupBody,
      });
      expect(response.status).toBe(201);
      return getToken(mailer().messages[0].html);
    };
    const verify = async () => {
      const { response } = await this.ctx.client.POST('/auth/verify', {
        body: { token: await signup() },
      });
      expect(response.status).toBe(204);
    };
    const signin = async () => {
      await verify();
      const { data, response } = await this.ctx.client.POST('/auth/signin', {
        body: { email: signupBody.email, password: signupBody.password },
      });
      expect(response.status).toBe(200);
      return SessionResponse.parse(data);
    };

    describe('Auth', () => {
      describe('security', () => {
        it('rejects a request without an API key', async () => {
          const { response } = await this.ctx.clientWithoutApiKey.POST(
            '/auth/signup',
            { body: signupBody },
          );
          expect(response.status).toBe(401);
        });

        it('rejects /auth/me without a bearer token', async () => {
          const { response } = await this.ctx.client.GET('/auth/me');
          expect(response.status).toBe(401);
        });
      });

      describe('signup', () => {
        it('sends a styled verification email with a fallback link', async () => {
          await signup();
          expect(mailer().messages[0].html).toContain('Verify Email Address');
          expect(mailer().messages[0].html).toContain(
            'copy and paste this link',
          );
        });

        it('requires exactly one token placeholder in redirectUrl', async () => {
          const { response } = await this.ctx.client.POST('/auth/signup', {
            body: {
              ...signupBody,
              redirectUrl: 'https://app.cryptosharia.id/verify',
            },
          });
          expect(response.status).toBe(400);
        });
      });

      describe('verify', () => {
        it('verifies an email and rejects token reuse', async () => {
          const token = await signup();
          const { response } = await this.ctx.client.POST('/auth/verify', {
            body: { token },
          });
          expect(response.status).toBe(204);
          const reused = await this.ctx.client.POST('/auth/verify', {
            body: { token },
          });
          expect(reused.response.status).toBe(404);
        });
      });

      describe('signin', () => {
        it('rejects an unverified account', async () => {
          await signup();
          const { response } = await this.ctx.client.POST('/auth/signin', {
            body: { email: signupBody.email, password: signupBody.password },
          });
          expect(response.status).toBe(401);
        });

        it('returns only an access and refresh token after verification', async () => {
          const session = await signin();
          expect(typeof session.accessToken).toBe('string');
          expect(typeof session.refreshToken).toBe('string');
        });
      });

      describe('refresh', () => {
        it('rotates the refresh token and rejects the old token', async () => {
          const session = await signin();
          const refreshed = await this.ctx.client.POST('/auth/refresh', {
            body: { refreshToken: session.refreshToken },
          });
          expect(refreshed.response.status).toBe(200);
          const rotated = SessionResponse.parse(refreshed.data);
          expect(rotated.refreshToken).not.toBe(session.refreshToken);
          const reused = await this.ctx.client.POST('/auth/refresh', {
            body: { refreshToken: session.refreshToken },
          });
          expect(reused.response.status).toBe(401);
        });
      });

      describe('signout', () => {
        it('revokes a refresh token idempotently', async () => {
          const session = await signin();
          const first = await this.ctx.client.POST('/auth/signout', {
            body: { refreshToken: session.refreshToken },
          });
          const second = await this.ctx.client.POST('/auth/signout', {
            body: { refreshToken: session.refreshToken },
          });
          expect(first.response.status).toBe(204);
          expect(second.response.status).toBe(204);
        });
      });

      describe('me', () => {
        it('returns the safe user profile without permissions', async () => {
          const session = await signin();
          const { data, response } = await this.ctx.client.GET('/auth/me', {
            headers: { authorization: `Bearer ${session.accessToken}` },
          });
          expect(response.status).toBe(200);
          expect(data).toMatchObject({
            email: signupBody.email,
            role: 'member',
          });
          expect(data).not.toHaveProperty('permissions');
          expect(data).not.toHaveProperty('hashedPassword');
        });
      });

      describe('forgot password', () => {
        it('returns no content for unknown and known emails', async () => {
          const unknown = await this.ctx.client.POST('/auth/password/forgot', {
            body: {
              email: 'unknown@example.com',
              redirectUrl: 'https://app.cryptosharia.id/reset-password/{token}',
            },
          });
          expect(unknown.response.status).toBe(204);
          await signup();
          const known = await this.ctx.client.POST('/auth/password/forgot', {
            body: {
              email: signupBody.email,
              redirectUrl: 'https://app.cryptosharia.id/reset-password/{token}',
            },
          });
          expect(known.response.status).toBe(204);
          expect(mailer().messages.at(-1)?.subject).toBe(
            'Reset your CryptoSharia password',
          );
        });
      });

      describe('reset password', () => {
        it('changes the password and invalidates the old password', async () => {
          await verify();
          const forgot = await this.ctx.client.POST('/auth/password/forgot', {
            body: {
              email: signupBody.email,
              redirectUrl: 'https://app.cryptosharia.id/reset-password/{token}',
            },
          });
          expect(forgot.response.status).toBe(204);
          const token = getToken(mailer().messages.at(-1)!.html);
          const reset = await this.ctx.client.POST('/auth/password/reset', {
            body: { token, password: 'new-secure-password' },
          });
          expect(reset.response.status).toBe(204);
          const oldPassword = await this.ctx.client.POST('/auth/signin', {
            body: { email: signupBody.email, password: signupBody.password },
          });
          const newPassword = await this.ctx.client.POST('/auth/signin', {
            body: { email: signupBody.email, password: 'new-secure-password' },
          });
          expect(oldPassword.response.status).toBe(401);
          expect(newPassword.response.status).toBe(200);
        });
      });
    });
  }
}
