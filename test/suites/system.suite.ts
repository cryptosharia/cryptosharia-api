import { Suite } from '#test/helpers/suite.base';

export class SystemSuite extends Suite {
  register() {
    describe('System', () => {
      it('allows the health endpoint without an API key', async () => {
        const response = await fetch(`${this.ctx.baseUrl}/health`);

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ status: 'UP' });
      });
    });
  }
}
