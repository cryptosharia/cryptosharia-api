import { writeFile } from 'node:fs/promises';
import openapiTS, { astToString, type OpenAPI3 } from 'openapi-typescript';
import { generateOpenApiDocument } from '#src/modules/openapi/openapi.registry';

async function main() {
  const document = generateOpenApiDocument();
  const ast = await openapiTS(document as OpenAPI3);
  await writeFile('test/schema.d.ts', astToString(ast));
}
main().catch((error: unknown) => { console.error(error); process.exit(1); });
