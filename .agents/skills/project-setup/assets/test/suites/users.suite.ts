import type { Context } from '#test/helpers/context.type';
import { Suite } from '#test/helpers/suite.base';

export class UsersSuite extends Suite {
  constructor(ctx: Context) {
    super(ctx);
  }

  register() {
    describe('Users', () => {
      describe('selectAll', () => {
        it('should return an empty array when no users exist', async () => {
          const { data, response } = await this.ctx.client.GET('/users');

          expect(response.status).toBe(200);
          expect(data).toEqual([]);
        });
      });

      describe('selectById', () => {
        it('should return 404 when user does not exist', async () => {
          const { response } = await this.ctx.client.GET('/users/{id}', {
            params: { path: { id: crypto.randomUUID() } },
          });

          expect(response.status).toBe(404);
        });
      });
    });
  }
}
