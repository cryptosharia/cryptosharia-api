import { Suite } from '#test/helpers/suite.base';

export class OpenApiSuite extends Suite {
  register() {
    describe('OpenAPI', () => {
      it('allows OpenAPI JSON without an API key', async () => {
        const response = await fetch(`${this.ctx.baseUrl}/openapi.json`);

        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toContain(
          'application/json',
        );
      });

      it('allows OpenAPI YAML without an API key', async () => {
        const response = await fetch(`${this.ctx.baseUrl}/openapi.yaml`);

        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toContain(
          'application/yaml',
        );
      });

      it('allows the Scalar documentation page without an API key', async () => {
        const response = await fetch(`${this.ctx.baseUrl}/`);

        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toContain('text/html');
      });
    });
  }
}
