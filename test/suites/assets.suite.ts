import { MailerService } from '#src/modules/mailer/mailer.service';
import { UsersService } from '#src/modules/users/users.service';
import { StorageService } from '#src/modules/storage/storage.service';
import { ImageProviderService } from '#src/modules/image-provider/image-provider.service';
import { StorageError } from '#src/modules/storage/storage.error';
import { ImageProviderError } from '#src/modules/image-provider/image-provider.error';
import type { Context } from '#test/helpers/context.type';
import { Suite } from '#test/helpers/suite.base';
import type { TestMailerService } from '#test/helpers/test-mailer.service';
import { TestStorageService } from '#test/helpers/test-storage.service';
import { TestImageProviderService } from '#test/helpers/test-image-provider.service';

function getToken(html: string) {
  const match = html.match(/verify\/([^"<]+)/);
  if (!match) throw new Error('Email does not contain a verification token');
  return match[1];
}

export class AssetsSuite extends Suite {
  constructor(ctx: Context) {
    super(ctx);
  }

  register() {
    const mailer = () => this.ctx.app.get<TestMailerService>(MailerService);
    const storage = () => this.ctx.app.get<TestStorageService>(StorageService);
    const imageProvider = () =>
      this.ctx.app.get<TestImageProviderService>(ImageProviderService);
    const usersService = () => this.ctx.app.get(UsersService);

    const createSession = async (
      email: string,
      role: 'posts_manager' | 'tokens_manager' | 'member' = 'member',
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

    describe('Assets', () => {
      describe('security', () => {
        it('rejects uploads without an API key', async () => {
          const form = new FormData();
          form.set('file', new File(['x'], 'a.txt', { type: 'text/plain' }));

          const { response } = await this.ctx.clientWithoutApiKey.POST(
            '/assets',
            { body: form },
          );
          expect(response.status).toBe(401);
        });

        it('rejects uploads without a bearer token', async () => {
          const form = new FormData();
          form.set('file', new File(['x'], 'a.txt', { type: 'text/plain' }));

          const { response } = await this.ctx.client.POST('/assets', {
            body: form,
          });
          expect(response.status).toBe(401);
        });

        it('rejects uploads from a member without manage permissions', async () => {
          const { accessToken } = await createSession(
            'member-assets@example.com',
            'member',
          );
          const form = new FormData();
          form.set('file', new File(['x'], 'a.txt', { type: 'text/plain' }));

          const { response } = await this.ctx.client.POST('/assets', {
            body: form,
            headers: { authorization: `Bearer ${accessToken}` },
          });
          expect(response.status).toBe(403);
        });
      });

      describe('asset upload validation', () => {
        const managerToken = async () =>
          (await createSession('manager-assets@example.com', 'posts_manager'))
            .accessToken;

        it('rejects a missing file', async () => {
          const accessToken = await managerToken();

          const { error, response } = await this.ctx.client.POST('/assets', {
            body: new FormData(),
            headers: { authorization: `Bearer ${accessToken}` },
          });

          expect(response.status).toBe(422);
          expect(error?.error).toBe('VALIDATION_FAILED');
          expect(
            (
              error as
                { details?: { fields?: Record<string, string[]> } } | undefined
            )?.details?.fields?.file,
          ).toBeDefined();
        });

        it('rejects an empty file', async () => {
          const accessToken = await managerToken();
          const form = new FormData();
          form.set('file', new File([], 'empty.txt', { type: 'text/plain' }));

          const { error, response } = await this.ctx.client.POST('/assets', {
            body: form,
            headers: { authorization: `Bearer ${accessToken}` },
          });

          expect(response.status).toBe(422);
          expect(error?.error).toBe('VALIDATION_FAILED');
        });

        it('rejects a file over 4MB', async () => {
          const accessToken = await managerToken();
          const form = new FormData();
          form.set(
            'file',
            new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'oversized.bin', {
              type: 'application/octet-stream',
            }),
          );

          const { error, response } = await this.ctx.client.POST('/assets', {
            body: form,
            headers: { authorization: `Bearer ${accessToken}` },
          });

          expect(response.status).toBe(422);
          expect(error?.error).toBe('VALIDATION_FAILED');
        });
      });

      describe('imgbb upload validation', () => {
        const managerToken = async () =>
          (await createSession('manager-imgbb@example.com', 'tokens_manager'))
            .accessToken;

        it('rejects a non-image file', async () => {
          const accessToken = await managerToken();
          const form = new FormData();
          form.set(
            'file',
            new File(['hello'], 'notes.txt', { type: 'text/plain' }),
          );

          const { error, response } = await this.ctx.client.POST('/imgbb', {
            body: form,
            headers: { authorization: `Bearer ${accessToken}` },
          });

          expect(response.status).toBe(422);
          expect(error?.error).toBe('VALIDATION_FAILED');
        });

        it('rejects an image over 32MB', async () => {
          const accessToken = await managerToken();
          const form = new FormData();
          form.set(
            'file',
            new File([new Uint8Array(32 * 1024 * 1024 + 1)], 'huge.png', {
              type: 'image/png',
            }),
          );

          const { error, response } = await this.ctx.client.POST('/imgbb', {
            body: form,
            headers: { authorization: `Bearer ${accessToken}` },
          });

          expect(response.status).toBe(422);
          expect(error?.error).toBe('VALIDATION_FAILED');
        });
      });

      describe('successful uploads', () => {
        it('uploads an asset and persists metadata', async () => {
          const { accessToken } = await createSession(
            'success-assets@example.com',
            'posts_manager',
          );
          const form = new FormData();
          form.set(
            'file',
            new File(['hello'], 'cover.txt', { type: 'text/plain' }),
          );

          const { data, response } = await this.ctx.client.POST('/assets', {
            body: form,
            headers: { authorization: `Bearer ${accessToken}` },
          });

          expect(response.status).toBe(201);
          expect(data?.filename).toBe('cover.txt');
          expect(data?.provider).toBe('vercel_blob');
          expect(data?.size).toBe(5);
          expect(data?.id).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
          );
          expect(storage().upload).toHaveBeenCalledTimes(1);
        });

        it('uploads an image through the image provider and persists metadata', async () => {
          const { accessToken } = await createSession(
            'success-imgbb@example.com',
            'posts_manager',
          );
          const form = new FormData();
          form.set(
            'file',
            new File(['image'], 'cover.png', { type: 'image/png' }),
          );

          const { data, response } = await this.ctx.client.POST('/imgbb', {
            body: form,
            headers: { authorization: `Bearer ${accessToken}` },
          });

          expect(response.status).toBe(201);
          expect(data?.imgbbId).toBe('imgbb-test-id');
          expect(data?.url).toBe('https://i.ibb.co/test-image.png');
          expect(data?.mimeType).toBe('image/png');
          expect(imageProvider().upload).toHaveBeenCalledTimes(1);
        });
      });

      describe('provider failures', () => {
        it('maps storage upload failures to a 502', async () => {
          const { accessToken } = await createSession(
            'fail-assets@example.com',
            'posts_manager',
          );
          storage().upload.mockRejectedValueOnce(
            new StorageError('UPLOAD_FAILED'),
          );
          const form = new FormData();
          form.set(
            'file',
            new File(['hello'], 'cover.txt', { type: 'text/plain' }),
          );

          const { error, response } = await this.ctx.client.POST('/assets', {
            body: form,
            headers: { authorization: `Bearer ${accessToken}` },
          });

          expect(response.status).toBe(502);
          expect(error?.error).toBe('STORAGE_UPLOAD_FAILED');
        });

        it('maps image provider failures to a 502', async () => {
          const { accessToken } = await createSession(
            'fail-imgbb@example.com',
            'tokens_manager',
          );
          imageProvider().upload.mockRejectedValueOnce(
            new ImageProviderError('UPLOAD_FAILED'),
          );
          const form = new FormData();
          form.set(
            'file',
            new File(['image'], 'cover.png', { type: 'image/png' }),
          );

          const { error, response } = await this.ctx.client.POST('/imgbb', {
            body: form,
            headers: { authorization: `Bearer ${accessToken}` },
          });

          expect(response.status).toBe(502);
          expect(error?.error).toBe('IMAGE_UPLOAD_FAILED');
        });
      });
    });
  }
}
