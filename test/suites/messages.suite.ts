import { MailerService } from '#src/modules/mailer/mailer.service';
import { UsersService } from '#src/modules/users/users.service';
import { Suite } from '#test/helpers/suite.base';
import type { TestMailerService } from '#test/helpers/test-mailer.service';

function getToken(html: string) {
  const match = html.match(/verify\/([^"<]+)/);
  if (!match) throw new Error('Email does not contain a verification token');
  return match[1];
}

export class MessagesSuite extends Suite {
  register() {
    const mailer = () => this.ctx.app.get<TestMailerService>(MailerService);
    const users = () => this.ctx.app.get(UsersService);
    const createSession = async (
      email: string,
      role: 'member' | 'admin' = 'member',
    ) => {
      const password = 'secure-password';
      await this.ctx.client.POST('/auth/signup', {
        body: {
          name: 'Message User',
          email,
          password,
          redirectUrl: 'https://app.cryptosharia.id/verify/{token}',
        },
      });
      await this.ctx.client.POST('/auth/verify', {
        body: { token: getToken(mailer().messages.at(-1)!.html) },
      });
      const user = await users().selectByEmail(email);
      if (role !== 'member') await users().update(user.id, { role });
      const signin = await this.ctx.client.POST('/auth/signin', {
        body: { email, password },
      });
      if (!signin.data) throw new Error('Signin response has no token pair');
      return signin.data.accessToken;
    };

    describe('Messages', () => {
      describe('security', () => {
        it('rejects message listing without an API key', async () => {
          const { response } =
            await this.ctx.clientWithoutApiKey.GET('/messages');
          expect(response.status).toBe(401);
        });

        it('requires a bearer token and messages.read to list messages', async () => {
          const withoutBearer = await this.ctx.client.GET('/messages');
          expect(withoutBearer.response.status).toBe(401);

          const accessToken = await createSession('message-member@example.com');
          const forbidden = await this.ctx.client.GET('/messages', {
            headers: { authorization: `Bearer ${accessToken}` },
          });
          expect(forbidden.response.status).toBe(403);
        });
      });

      describe('create', () => {
        it('creates a message and sends an escaped notification', async () => {
          const { data, response } = await this.ctx.client.POST('/messages', {
            body: {
              name: '<b>John</b>',
              email: 'john@example.com',
              message: '<script>alert(1)</script>',
            },
          });
          expect(response.status).toBe(201);
          expect(data?.name).toBe('<b>John</b>');
          expect(mailer().messages.at(-1)?.html).toContain(
            '&lt;b&gt;John&lt;/b&gt;',
          );
          expect(mailer().messages.at(-1)?.html).toContain(
            '&lt;script&gt;alert(1)&lt;/script&gt;',
          );
        });

        it('rejects an invalid message payload', async () => {
          const { error, response } = await this.ctx.client.POST('/messages', {
            body: { name: '', email: 'invalid', message: 'short' },
          });
          expect(response.status).toBe(422);
          expect(error?.error).toBe('VALIDATION_FAILED');
        });
      });

      describe('selectAll', () => {
        it('filters messages by sender, search, and pagination', async () => {
          await this.ctx.client.POST('/messages', {
            body: {
              name: 'Alpha Sender',
              email: 'alpha@example.com',
              message: 'Unique sharia question',
            },
          });
          await this.ctx.client.POST('/messages', {
            body: {
              name: 'Beta Sender',
              email: 'beta@example.com',
              message: 'Another question',
            },
          });
          const accessToken = await createSession(
            'message-admin@example.com',
            'admin',
          );
          const { data, response } = await this.ctx.client.GET('/messages', {
            params: {
              query: {
                senders: ['alpha@example.com'],
                search: 'sharia',
                page: 1,
                limit: 1,
              },
            },
            headers: { authorization: `Bearer ${accessToken}` },
          });
          expect(response.status).toBe(200);
          expect(response.headers.get('total-items')).toBe('1');
          expect(data).toHaveLength(1);
          expect(data?.[0]?.email).toBe('alpha@example.com');
        });
      });

      describe('selectById', () => {
        it('returns a message detail and handles invalid identifiers', async () => {
          const created = await this.ctx.client.POST('/messages', {
            body: {
              name: 'Detail Sender',
              email: 'detail@example.com',
              message: 'Message detail content',
            },
          });
          if (!created.data)
            throw new Error('Create message response has no data');
          const accessToken = await createSession(
            'message-detail-admin@example.com',
            'admin',
          );
          const found = await this.ctx.client.GET('/messages/{id}', {
            params: { path: { id: created.data.id } },
            headers: { authorization: `Bearer ${accessToken}` },
          });
          expect(found.response.status).toBe(200);
          expect(found.data?.id).toBe(created.data.id);

          const invalid = await this.ctx.client.GET('/messages/{id}', {
            params: { path: { id: 'invalid' } },
            headers: { authorization: `Bearer ${accessToken}` },
          });
          expect(invalid.response.status).toBe(422);

          const missing = await this.ctx.client.GET('/messages/{id}', {
            params: { path: { id: crypto.randomUUID() } },
            headers: { authorization: `Bearer ${accessToken}` },
          });
          expect(missing.response.status).toBe(404);
        });
      });
    });
  }
}
