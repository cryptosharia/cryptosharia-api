import { Controller, Get, Header } from '@nestjs/common';
import { generateOpenApiDocument } from './openapi.registry';
import yaml from 'yaml';

@Controller()
export class OpenApiController {
  private readonly document = generateOpenApiDocument();

  @Get('openapi.json') getSpecJson() {
    return this.document;
  }

  @Get('openapi.yaml')
  @Header('Content-Type', 'application/yaml')
  @Header('Content-Disposition', 'inline')
  getSpecYaml() {
    return yaml.stringify(this.document);
  }

  @Get()
  @Header('Content-Type', 'text/html')
  getDocs() {
    const openApiSpecPath = '/openapi.json';
    const theme = 'elysiajs';

    return `<!DOCTYPE html>
<html>
  <head><title>API Docs</title><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
  <body><div id="scalar-app"></div>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
    <script>Scalar.createApiReference('#scalar-app', { url: '${openApiSpecPath}', theme: '${theme}' })</script>
  </body>
</html>`;
  }
}
