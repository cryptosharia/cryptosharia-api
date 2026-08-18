import { MailerService } from '#src/modules/mailer/mailer.service';
import { UsersService } from '#src/modules/users/users.service';
import type { Context } from '#test/helpers/context.type';
import { Suite } from '#test/helpers/suite.base';
import type { TestMailerService } from '#test/helpers/test-mailer.service';

function getToken(html: string) {
  const match = html.match(/verify\/([^"<]+)/);
  if (!match) throw new Error('Email does not contain a verification token');
  return match[1];
}

export class UsersSuite extends Suite {
  constructor(ctx: Context) {
    super(ctx);
  }

  register() {
    const mailer = () => this.ctx.app.get<TestMailerService>(MailerService);
    const usersService = () => this.ctx.app.get(UsersService);
    const createSession = async (
      email: string,
      role: 'member' | 'super_admin' = 'member',
    ) => {
      const password = 'secure-password';
      const signup = await this.ctx.client.POST('/auth/signup', {
        body: {
          name: email.split('@')[0],
          email,
          password,
          redirectUrl: 'https://app.cryptosharia.id/verify/{token}',
        },
      });
      expect(signup.response.status).toBe(201);
      const verify = await this.ctx.client.POST('/auth/verify', {
        body: { token: getToken(mailer().messages.at(-1)!.html) },
      });
      expect(verify.response.status).toBe(204);

      const user = await usersService().selectByEmail(email);
      if (role !== 'member') await usersService().update(user.id, { role });

      const signin = await this.ctx.client.POST('/auth/signin', {
        body: { email, password },
      });
      expect(signin.response.status).toBe(200);
      if (!signin.data) throw new Error('Signin response has no token pair');
      return { user, accessToken: signin.data.accessToken };
    };

    describe('Users', () => {
      describe('security', () => {
        it('rejects requests without an API key', async () => {
          const { response } = await this.ctx.clientWithoutApiKey.GET('/users');
          expect(response.status).toBe(401);
        });

        it('rejects requests without a bearer token', async () => {
          const { data, response } = await this.ctx.client.GET('/users');
          expect(response.status).toBe(401);
          expect(data).toBeUndefined();
        });
      });

      describe('selectAll', () => {
        it('lists users with pagination and redacts sensitive fields', async () => {
          const admin = await createSession('admin@example.com', 'super_admin');
          await createSession('member@example.com');

          const { data, response } = await this.ctx.client.GET('/users', {
            params: { query: { page: 1, limit: 1 } },
            headers: { authorization: `Bearer ${admin.accessToken}` },
          });

          expect(response.status).toBe(200);
          expect(response.headers.get('total-items')).toBe('2');
          expect(data).toHaveLength(1);
          expect(data?.[0]).not.toHaveProperty('hashedPassword');
          expect(data?.[0]).not.toHaveProperty('twoFactorSecret');
        });

        it('filters users by role and search term', async () => {
          const admin = await createSession('admin@example.com', 'super_admin');
          await createSession('member@example.com');

          const { data, response } = await this.ctx.client.GET('/users', {
            params: {
              query: {
                page: 1,
                limit: 20,
                roles: ['member'],
                search: 'member',
              },
            },
            headers: { authorization: `Bearer ${admin.accessToken}` },
          });

          expect(response.status).toBe(200);
          expect(data).toHaveLength(1);
          expect(data?.[0]).toMatchObject({
            email: 'member@example.com',
            role: 'member',
          });
        });
      });

      describe('selectById', () => {
        it('allows a member to retrieve their own profile', async () => {
          const member = await createSession('member@example.com');
          const { data, response } = await this.ctx.client.GET('/users/{id}', {
            params: { path: { id: member.user.id } },
            headers: { authorization: `Bearer ${member.accessToken}` },
          });

          expect(response.status).toBe(200);
          expect(data).toMatchObject({
            id: member.user.id,
            email: 'member@example.com',
          });
        });

        it('returns not found for an unknown user', async () => {
          const admin = await createSession('admin@example.com', 'super_admin');
          const { response } = await this.ctx.client.GET('/users/{id}', {
            params: { path: { id: crypto.randomUUID() } },
            headers: { authorization: `Bearer ${admin.accessToken}` },
          });
          expect(response.status).toBe(404);
        });
      });

      describe('updateProfile', () => {
        it('allows a member to update their own profile', async () => {
          const member = await createSession('member@example.com');
          const { data, response } = await this.ctx.client.PATCH(
            '/users/{id}',
            {
              params: { path: { id: member.user.id } },
              body: { name: 'Updated Member' },
              headers: { authorization: `Bearer ${member.accessToken}` },
            },
          );

          expect(response.status).toBe(200);
          expect(data).toMatchObject({ name: 'Updated Member' });
        });

        it('rejects an empty profile update', async () => {
          const member = await createSession('member@example.com');
          const { error, response } = await this.ctx.client.PATCH(
            '/users/{id}',
            {
              params: { path: { id: member.user.id } },
              body: {},
              headers: { authorization: `Bearer ${member.accessToken}` },
            },
          );
          expect(response.status).toBe(422);
          expect(error?.error).toBe('VALIDATION_FAILED');
          expect(
            (error as { details?: { root?: string[] } } | undefined)?.details
              ?.root,
          ).toContain('Minimal satu field wajib diisi');
        });
      });

      describe('updateStatus', () => {
        it('allows a super admin to change account status', async () => {
          const admin = await createSession('admin@example.com', 'super_admin');
          const member = await createSession('member@example.com');
          const { data, response } = await this.ctx.client.PUT(
            '/users/{id}/status',
            {
              params: { path: { id: member.user.id } },
              body: { status: 'suspended' },
              headers: { authorization: `Bearer ${admin.accessToken}` },
            },
          );
          expect(response.status).toBe(200);
          expect(data).toMatchObject({ status: 'suspended' });
        });

        it('rejects status changes by a member', async () => {
          const member = await createSession('member@example.com');
          const { response } = await this.ctx.client.PUT('/users/{id}/status', {
            params: { path: { id: member.user.id } },
            body: { status: 'suspended' },
            headers: { authorization: `Bearer ${member.accessToken}` },
          });
          expect(response.status).toBe(403);
        });
      });

      describe('updateRole', () => {
        it('allows a super admin to change account role', async () => {
          const admin = await createSession('admin@example.com', 'super_admin');
          const member = await createSession('member@example.com');
          const { data, response } = await this.ctx.client.PUT(
            '/users/{id}/role',
            {
              params: { path: { id: member.user.id } },
              body: { role: 'posts_manager' },
              headers: { authorization: `Bearer ${admin.accessToken}` },
            },
          );
          expect(response.status).toBe(200);
          expect(data).toMatchObject({ role: 'posts_manager' });
        });
      });
    });
  }
}
