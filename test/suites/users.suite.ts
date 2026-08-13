import type { Context } from '#test/helpers/context.type';
import { Suite } from '#test/helpers/suite.base';

export class UsersSuite extends Suite {
  constructor(ctx: Context) {
    super(ctx);
  }

  register() {
    describe('Users', () => {
      describe('selectAll', () => {
        it('should reject requests without an API key', async () => {
          const { response } = await this.ctx.clientWithoutApiKey.GET('/users');

          expect(response.status).toBe(401);
        });

        it('should reject requests without a bearer token', async () => {
          const { data, response } = await this.ctx.client.GET('/users');

          expect(response.status).toBe(401);
          expect(data).toBeUndefined();
        });
      });

      describe('selectById', () => {
        it('should reject requests without an API key', async () => {
          const { response } = await this.ctx.clientWithoutApiKey.GET(
            '/users/{id}',
            {
              params: { path: { id: crypto.randomUUID() } },
            },
          );

          expect(response.status).toBe(401);
        });

        it('should reject requests without a bearer token', async () => {
          const { response } = await this.ctx.client.GET('/users/{id}', {
            params: { path: { id: crypto.randomUUID() } },
          });

          expect(response.status).toBe(401);
        });
      });
    });
  }
}
